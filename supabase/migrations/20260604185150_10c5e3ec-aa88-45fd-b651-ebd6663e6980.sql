
-- 1) UPDATE policy for cash_box_transactions (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cash_box_transactions' AND policyname='Users can update own cash box transactions cap') THEN
    CREATE POLICY "Users can update own cash box transactions cap" ON public.cash_box_transactions
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2) CHECK constraints — use NOT VALID to skip validation of any historical rows, then VALIDATE where safe.
DO $$
DECLARE
  v_pairs text[][] := ARRAY[
    ['products','products_price_non_negative','price >= 0'],
    ['products','products_cost_non_negative','cost IS NULL OR cost >= 0'],
    ['products','products_stock_non_negative','stock >= 0'],
    ['products','products_low_stock_non_negative','low_stock_alert >= 0'],
    ['customers','customers_points_non_negative','points >= 0'],
    ['customers','customers_credit_non_negative','credit_balance >= 0'],
    ['customers','customers_credit_limit_non_negative','credit_limit >= 0'],
    ['customers','customers_opening_debt_non_negative','opening_debt_balance >= 0'],
    ['sales','sales_subtotal_non_negative','subtotal >= 0'],
    ['sales','sales_tax_non_negative','tax >= 0'],
    ['sales','sales_discount_non_negative','discount >= 0'],
    ['sales','sales_total_non_negative','total >= 0'],
    ['sale_items','sale_items_price_non_negative','price >= 0'],
    ['sale_items','sale_items_quantity_positive','quantity > 0'],
    ['sale_items','sale_items_discount_non_negative','discount >= 0'],
    ['sale_items','sale_items_total_non_negative','total >= 0'],
    ['purchases','purchases_total_non_negative','total >= 0'],
    ['purchase_items','purchase_items_cost_non_negative','cost >= 0'],
    ['purchase_items','purchase_items_quantity_positive','quantity > 0'],
    ['purchase_items','purchase_items_total_non_negative','total >= 0'],
    ['cash_box_transactions','cashbox_amount_positive','amount > 0'],
    ['customer_payments','customer_payments_amount_positive','amount > 0'],
    ['expenses','expenses_amount_positive','amount > 0'],
    ['suppliers','suppliers_debt_non_negative','debt_balance >= 0']
  ];
  i int;
  v_table text;
  v_name text;
  v_expr text;
BEGIN
  FOR i IN 1 .. array_length(v_pairs,1) LOOP
    v_table := v_pairs[i][1];
    v_name  := v_pairs[i][2];
    v_expr  := v_pairs[i][3];
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public' AND t.relname=v_table AND c.conname=v_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', v_table, v_name, v_expr);
    END IF;
  END LOOP;
END $$;

-- 3) Recompute totals & points server-side in process_sale
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
)
RETURNS jsonb
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
  v_price numeric;
  v_item_discount numeric;
  v_item_total numeric;
  v_updated_rows integer;
  v_points_earned integer := 0;
  v_current_stock integer;
  v_product_name text;
  v_credit_limit numeric;
  v_current_credit numeric;
  v_calc_subtotal numeric := 0;
  v_calc_total numeric := 0;
  v_tax_rate numeric;
  v_tax_enabled boolean;
  v_points_per_dinar integer;
  v_calc_tax numeric;
  v_safe_discount numeric;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Sale must have at least one item'; END IF;
  IF p_payment_method NOT IN ('cash','credit') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_discount < 0 THEN RAISE EXCEPTION 'Discount cannot be negative'; END IF;
  IF p_points_to_redeem < 0 THEN RAISE EXCEPTION 'Points to redeem cannot be negative'; END IF;

  SELECT COALESCE(tax_rate, 0), COALESCE(tax_enabled, true), COALESCE(points_per_dinar, 1)
    INTO v_tax_rate, v_tax_enabled, v_points_per_dinar
  FROM public.user_settings WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    v_tax_rate := 0; v_tax_enabled := false; v_points_per_dinar := 1;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount')::numeric, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    IF v_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
    IF v_item_discount < 0 THEN RAISE EXCEPTION 'Item discount cannot be negative'; END IF;
    v_item_total := (v_price * v_qty) - v_item_discount;
    IF v_item_total < 0 THEN RAISE EXCEPTION 'Item total cannot be negative'; END IF;
    v_calc_subtotal := v_calc_subtotal + v_item_total;
  END LOOP;

  v_safe_discount := LEAST(p_discount, v_calc_subtotal);
  v_calc_tax := CASE WHEN v_tax_enabled THEN ROUND((v_calc_subtotal - v_safe_discount) * v_tax_rate, 3) ELSE 0 END;
  v_calc_total := GREATEST((v_calc_subtotal - v_safe_discount) + v_calc_tax, 0);

  IF p_payment_method = 'credit' AND p_customer_id IS NOT NULL THEN
    SELECT credit_limit, credit_balance INTO v_credit_limit, v_current_credit
    FROM public.customers WHERE id = p_customer_id AND user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found or access denied'; END IF;
    IF v_credit_limit > 0 AND (v_current_credit + v_calc_total) > v_credit_limit THEN
      RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED: limit=%, current=%, requested=%', v_credit_limit, v_current_credit, v_calc_total;
    END IF;
  END IF;

  INSERT INTO public.sales (user_id, subtotal, tax, discount, total, payment_method, customer_id)
  VALUES (v_user_id, v_calc_subtotal, v_calc_tax, v_safe_discount, v_calc_total, p_payment_method, p_customer_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount')::numeric, 0);

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
    VALUES (v_sale_id, v_product_id, v_item->>'product_name', v_price, v_qty, v_item_discount,
            (v_price * v_qty) - v_item_discount);
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

    v_points_earned := FLOOR(v_calc_total * GREATEST(v_points_per_dinar, 1))::integer;
    IF v_points_earned > 0 THEN
      UPDATE public.customers SET points = points + v_points_earned, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id;
      INSERT INTO public.points_transactions (customer_id, user_id, type, points, description)
      VALUES (p_customer_id, v_user_id, 'earn', v_points_earned, 'كسب نقاط - فاتورة');
    END IF;

    IF p_payment_method = 'credit' THEN
      UPDATE public.customers SET credit_balance = credit_balance + v_calc_total, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id;
    END IF;
  END IF;

  IF p_payment_method = 'cash' AND p_auto_add_to_cashbox AND v_calc_total > 0 THEN
    INSERT INTO public.cash_box_transactions (user_id, type, amount, category, description)
    VALUES (v_user_id, 'add', v_calc_total, 'sales', 'مبيعات - فاتورة ' || jsonb_array_length(p_items) || ' منتج');
  END IF;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'points_earned', v_points_earned, 'total', v_calc_total);
END;
$function$;
