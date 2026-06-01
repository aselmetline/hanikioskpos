-- Extend customers table
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS birthday DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;

-- Customer payments table (debt repayments)
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments TO authenticated;
GRANT ALL ON public.customer_payments TO service_role;

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own customer payments" ON public.customer_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own customer payments" ON public.customer_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own customer payments" ON public.customer_payments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own customer payments" ON public.customer_payments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_user ON public.customer_payments(user_id);

-- Update process_sale to enforce credit_limit
CREATE OR REPLACE FUNCTION public.process_sale(
  p_items jsonb,
  p_subtotal numeric,
  p_tax numeric,
  p_discount numeric,
  p_total numeric,
  p_payment_method text,
  p_customer_id uuid DEFAULT NULL::uuid,
  p_points_to_redeem integer DEFAULT 0,
  p_auto_add_to_cashbox boolean DEFAULT false,
  p_points_per_dinar integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_sale_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_updated_rows integer;
  v_points_earned integer := 0;
  v_current_stock integer;
  v_product_name text;
  v_credit_limit numeric;
  v_current_credit numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Sale must have at least one item'; END IF;
  IF p_payment_method NOT IN ('cash','credit') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  -- Enforce credit limit BEFORE inserting anything
  IF p_payment_method = 'credit' AND p_customer_id IS NOT NULL THEN
    SELECT credit_limit, credit_balance INTO v_credit_limit, v_current_credit
    FROM public.customers WHERE id = p_customer_id AND user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found or access denied'; END IF;
    IF v_credit_limit > 0 AND (v_current_credit + p_total) > v_credit_limit THEN
      RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED: limit=%, current=%, requested=%', v_credit_limit, v_current_credit, p_total;
    END IF;
  END IF;

  INSERT INTO public.sales (user_id, subtotal, tax, discount, total, payment_method, customer_id)
  VALUES (v_user_id, p_subtotal, p_tax, p_discount, p_total, p_payment_method, p_customer_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;

    IF v_product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock = stock - v_qty, updated_at = now()
      WHERE id = v_product_id AND user_id = v_user_id AND stock >= v_qty
      RETURNING stock + v_qty, name_ar INTO v_current_stock, v_product_name;
      GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
      IF v_updated_rows = 0 THEN
        SELECT stock, name_ar INTO v_current_stock, v_product_name FROM public.products WHERE id = v_product_id AND user_id = v_user_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or access denied';
        ELSE RAISE EXCEPTION 'Insufficient stock for product %: available %, requested %', v_product_name, v_current_stock, v_qty; END IF;
      END IF;
    END IF;

    INSERT INTO public.sale_items (sale_id, product_id, product_name, price, quantity, discount, total)
    VALUES (v_sale_id, v_product_id, v_item->>'product_name', (v_item->>'price')::numeric, v_qty,
            COALESCE((v_item->>'discount')::numeric,0),
            ((v_item->>'price')::numeric * v_qty) - COALESCE((v_item->>'discount')::numeric,0));
  END LOOP;

  IF p_customer_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Customer not found or access denied';
    END IF;

    IF p_points_to_redeem > 0 THEN
      UPDATE public.customers SET points = points - p_points_to_redeem, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id AND points >= p_points_to_redeem;
      GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
      IF v_updated_rows = 0 THEN RAISE EXCEPTION 'Insufficient points to redeem'; END IF;
      INSERT INTO public.points_transactions (customer_id, user_id, type, points, description)
      VALUES (p_customer_id, v_user_id, 'redeem', -p_points_to_redeem, 'استبدال نقاط - فاتورة');
    END IF;

    v_points_earned := FLOOR(p_total * GREATEST(p_points_per_dinar,1))::integer;
    IF v_points_earned > 0 THEN
      UPDATE public.customers SET points = points + v_points_earned, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id;
      INSERT INTO public.points_transactions (customer_id, user_id, type, points, description)
      VALUES (p_customer_id, v_user_id, 'earn', v_points_earned, 'كسب نقاط - فاتورة');
    END IF;

    IF p_payment_method = 'credit' THEN
      UPDATE public.customers SET credit_balance = credit_balance + p_total, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id;
    END IF;
  END IF;

  IF p_payment_method = 'cash' AND p_auto_add_to_cashbox THEN
    INSERT INTO public.cash_box_transactions (user_id, type, amount, category, description)
    VALUES (v_user_id, 'add', p_total, 'sales', 'مبيعات - فاتورة ' || jsonb_array_length(p_items) || ' منتج');
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'points_earned', v_points_earned);
END;
$function$;

REVOKE ALL ON FUNCTION public.process_sale(jsonb,numeric,numeric,numeric,numeric,text,uuid,integer,boolean,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb,numeric,numeric,numeric,numeric,text,uuid,integer,boolean,integer) TO authenticated;

-- Atomic customer payment
CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'cash',
  p_notes text DEFAULT NULL,
  p_add_to_cashbox boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_payment_id uuid;
  v_customer_name text;
  v_updated integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  -- Decrement credit_balance atomically (cap at 0)
  UPDATE public.customers
  SET credit_balance = GREATEST(credit_balance - p_amount, 0), updated_at = now()
  WHERE id = p_customer_id AND user_id = v_user_id
  RETURNING name INTO v_customer_name;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN RAISE EXCEPTION 'Customer not found or access denied'; END IF;

  INSERT INTO public.customer_payments (user_id, customer_id, amount, payment_method, notes)
  VALUES (v_user_id, p_customer_id, p_amount, p_payment_method, p_notes)
  RETURNING id INTO v_payment_id;

  IF p_add_to_cashbox AND p_payment_method = 'cash' THEN
    INSERT INTO public.cash_box_transactions (user_id, type, amount, category, description)
    VALUES (v_user_id, 'add', p_amount, 'customer_payment', 'تسديد دين - ' || COALESCE(v_customer_name,''));
  END IF;

  RETURN jsonb_build_object('payment_id', v_payment_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_customer_payment(uuid,numeric,text,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text,text,boolean) TO authenticated;