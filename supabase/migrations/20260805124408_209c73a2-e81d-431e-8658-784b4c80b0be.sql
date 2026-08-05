-- 1) Tighten policy roles: public -> authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, pol.polname AS pol
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND pol.polroles = ARRAY[0]::oid[]
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.pol, r.tbl);
  END LOOP;
END $$;

-- 2) Length constraints
ALTER TABLE public.customers
  ADD CONSTRAINT customers_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  ADD CONSTRAINT customers_phone_len CHECK (phone IS NULL OR char_length(phone) <= 40),
  ADD CONSTRAINT customers_email_len CHECK (email IS NULL OR char_length(email) <= 255),
  ADD CONSTRAINT customers_address_len CHECK (address IS NULL OR char_length(address) <= 500),
  ADD CONSTRAINT customers_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000);

ALTER TABLE public.products
  ADD CONSTRAINT products_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  ADD CONSTRAINT products_name_ar_len CHECK (char_length(name_ar) BETWEEN 1 AND 200),
  ADD CONSTRAINT products_barcode_len CHECK (barcode IS NULL OR char_length(barcode) <= 100),
  ADD CONSTRAINT products_unit_len CHECK (char_length(unit) <= 50);

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_name_len CHECK (char_length(name) BETWEEN 1 AND 200),
  ADD CONSTRAINT suppliers_phone_len CHECK (phone IS NULL OR char_length(phone) <= 40),
  ADD CONSTRAINT suppliers_address_len CHECK (address IS NULL OR char_length(address) <= 500),
  ADD CONSTRAINT suppliers_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000);

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_description_len CHECK (description IS NULL OR char_length(description) <= 1000),
  ADD CONSTRAINT expenses_category_len CHECK (char_length(category) <= 100);

ALTER TABLE public.cash_box_transactions
  ADD CONSTRAINT cashbox_description_len CHECK (description IS NULL OR char_length(description) <= 1000),
  ADD CONSTRAINT cashbox_category_len CHECK (char_length(category) <= 100);

ALTER TABLE public.customer_payments
  ADD CONSTRAINT customer_payments_notes_len CHECK (notes IS NULL OR char_length(notes) <= 1000);

ALTER TABLE public.points_transactions
  ADD CONSTRAINT points_description_len CHECK (description IS NULL OR char_length(description) <= 500);

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_invoice_number_len CHECK (char_length(invoice_number) BETWEEN 1 AND 100);

ALTER TABLE public.purchase_items
  ADD CONSTRAINT purchase_items_name_len CHECK (char_length(product_name) BETWEEN 1 AND 200);

ALTER TABLE public.sale_items
  ADD CONSTRAINT sale_items_name_len CHECK (char_length(product_name) BETWEEN 1 AND 200);

-- 3) Cap number of items per sale inside process_sale
CREATE OR REPLACE FUNCTION public.process_sale(p_items jsonb, p_subtotal numeric, p_tax numeric, p_discount numeric, p_total numeric, p_payment_method text, p_customer_id uuid DEFAULT NULL::uuid, p_points_to_redeem integer DEFAULT 0, p_auto_add_to_cashbox boolean DEFAULT false, p_points_per_dinar integer DEFAULT 1)
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
  v_line_ht numeric;
  v_line_rate numeric;
  v_updated_rows integer;
  v_points_earned integer := 0;
  v_current_stock integer;
  v_product_name text;
  v_credit_limit numeric;
  v_current_credit numeric;
  v_calc_subtotal numeric := 0;
  v_calc_total numeric := 0;
  v_tax_enabled boolean;
  v_points_per_dinar integer;
  v_calc_tax numeric := 0;
  v_safe_discount numeric;
  v_discount_ratio numeric := 0;
  v_taxable_after numeric;
  v_line_tax numeric;
  v_breakdown jsonb := '{}'::jsonb;
  v_rate_key text;
  v_stamp_enabled boolean;
  v_stamp_amount numeric;
  v_fiscal_stamp numeric := 0;
  v_invoice_number bigint;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Sale must have at least one item'; END IF;
  IF jsonb_array_length(p_items) > 200 THEN RAISE EXCEPTION 'Too many items in one sale (max 200)'; END IF;
  IF p_payment_method NOT IN ('cash','credit') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  IF p_discount < 0 THEN RAISE EXCEPTION 'Discount cannot be negative'; END IF;
  IF p_points_to_redeem < 0 THEN RAISE EXCEPTION 'Points to redeem cannot be negative'; END IF;

  SELECT COALESCE(tax_enabled, true),
         COALESCE(points_per_dinar, 1),
         COALESCE(fiscal_stamp_enabled, true),
         COALESCE(fiscal_stamp_amount, 1.000)
    INTO v_tax_enabled, v_points_per_dinar, v_stamp_enabled, v_stamp_amount
  FROM public.user_settings WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    v_tax_enabled := false; v_points_per_dinar := 1;
    v_stamp_enabled := false; v_stamp_amount := 0;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount')::numeric, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    IF v_price < 0 THEN RAISE EXCEPTION 'Price cannot be negative'; END IF;
    IF v_item_discount < 0 THEN RAISE EXCEPTION 'Item discount cannot be negative'; END IF;
    v_line_ht := (v_price * v_qty) - v_item_discount;
    IF v_line_ht < 0 THEN RAISE EXCEPTION 'Item total cannot be negative'; END IF;
    v_calc_subtotal := v_calc_subtotal + v_line_ht;
  END LOOP;

  v_safe_discount := LEAST(p_discount, v_calc_subtotal);
  IF v_calc_subtotal > 0 THEN
    v_discount_ratio := v_safe_discount / v_calc_subtotal;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount')::numeric, 0);
    v_line_rate := COALESCE((v_item->>'tax_rate')::numeric, 0.19);
    IF NOT v_tax_enabled THEN v_line_rate := 0; END IF;

    v_line_ht := (v_price * v_qty) - v_item_discount;
    v_taxable_after := ROUND(v_line_ht * (1 - v_discount_ratio), 3);
    v_line_tax := ROUND(v_taxable_after * v_line_rate, 3);
    v_calc_tax := v_calc_tax + v_line_tax;

    v_rate_key := to_char(v_line_rate, 'FM0.00');
    v_breakdown := jsonb_set(
      v_breakdown,
      ARRAY[v_rate_key],
      jsonb_build_object(
        'base', COALESCE((v_breakdown->v_rate_key->>'base')::numeric, 0) + v_taxable_after,
        'tax',  COALESCE((v_breakdown->v_rate_key->>'tax')::numeric, 0) + v_line_tax
      ),
      true
    );
  END LOOP;

  IF v_stamp_enabled AND p_payment_method = 'cash' THEN
    v_fiscal_stamp := v_stamp_amount;
  END IF;

  v_calc_total := GREATEST((v_calc_subtotal - v_safe_discount) + v_calc_tax + v_fiscal_stamp, 0);

  IF p_payment_method = 'credit' AND p_customer_id IS NOT NULL THEN
    SELECT credit_limit, credit_balance INTO v_credit_limit, v_current_credit
    FROM public.customers WHERE id = p_customer_id AND user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found or access denied'; END IF;
    IF v_credit_limit > 0 AND (v_current_credit + v_calc_total) > v_credit_limit THEN
      RAISE EXCEPTION 'CREDIT_LIMIT_EXCEEDED: limit=%, current=%, requested=%', v_credit_limit, v_current_credit, v_calc_total;
    END IF;
  END IF;

  INSERT INTO public.invoice_counters (user_id, last_invoice_number)
  VALUES (v_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET last_invoice_number = public.invoice_counters.last_invoice_number + 1,
        updated_at = now()
  RETURNING last_invoice_number INTO v_invoice_number;

  INSERT INTO public.sales (user_id, subtotal, tax, discount, total, payment_method, customer_id,
                            invoice_number, fiscal_stamp, tax_breakdown)
  VALUES (v_user_id, v_calc_subtotal, v_calc_tax, v_safe_discount, v_calc_total, p_payment_method, p_customer_id,
          v_invoice_number, v_fiscal_stamp, v_breakdown)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id','')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;
    v_item_discount := COALESCE((v_item->>'discount')::numeric, 0);
    v_line_rate := COALESCE((v_item->>'tax_rate')::numeric, 0.19);
    IF NOT v_tax_enabled THEN v_line_rate := 0; END IF;

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

    INSERT INTO public.sale_items (sale_id, product_id, product_name, price, quantity, discount, total, tax_rate)
    VALUES (v_sale_id, v_product_id, LEFT(COALESCE(v_item->>'product_name',''), 200), v_price, v_qty, v_item_discount,
            (v_price * v_qty) - v_item_discount, v_line_rate);
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
    VALUES (v_user_id, 'add', v_calc_total, 'sales', 'مبيعات - فاتورة ' || v_invoice_number);
  END IF;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'points_earned', v_points_earned,
    'total', v_calc_total,
    'invoice_number', v_invoice_number,
    'fiscal_stamp', v_fiscal_stamp,
    'tax_breakdown', v_breakdown
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) TO authenticated;