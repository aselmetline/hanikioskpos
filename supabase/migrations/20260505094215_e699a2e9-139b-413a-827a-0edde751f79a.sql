-- Atomic sale processing function
CREATE OR REPLACE FUNCTION public.process_sale(
  p_items jsonb,                -- [{product_id, product_name, price, quantity, discount}]
  p_subtotal numeric,
  p_tax numeric,
  p_discount numeric,
  p_total numeric,
  p_payment_method text,
  p_customer_id uuid DEFAULT NULL,
  p_points_to_redeem integer DEFAULT 0,
  p_auto_add_to_cashbox boolean DEFAULT false,
  p_points_per_dinar integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale must have at least one item';
  END IF;

  IF p_payment_method NOT IN ('cash', 'credit') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  -- 1. Insert sale header
  INSERT INTO public.sales (user_id, subtotal, tax, discount, total, payment_method, customer_id)
  VALUES (v_user_id, p_subtotal, p_tax, p_discount, p_total, p_payment_method, p_customer_id)
  RETURNING id INTO v_sale_id;

  -- 2. Loop items: atomic stock decrement + insert sale_item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    -- Atomic stock decrement with stock check (only if product_id provided)
    IF v_product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock = stock - v_qty,
          updated_at = now()
      WHERE id = v_product_id
        AND user_id = v_user_id
        AND stock >= v_qty
      RETURNING stock + v_qty, name_ar INTO v_current_stock, v_product_name;

      GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
      IF v_updated_rows = 0 THEN
        -- Either product doesn't belong to user or insufficient stock
        SELECT stock, name_ar INTO v_current_stock, v_product_name
        FROM public.products WHERE id = v_product_id AND user_id = v_user_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Product not found or access denied';
        ELSE
          RAISE EXCEPTION 'Insufficient stock for product %: available %, requested %',
            v_product_name, v_current_stock, v_qty;
        END IF;
      END IF;
    END IF;

    -- Insert sale item
    INSERT INTO public.sale_items (sale_id, product_id, product_name, price, quantity, discount, total)
    VALUES (
      v_sale_id,
      v_product_id,
      v_item->>'product_name',
      (v_item->>'price')::numeric,
      v_qty,
      COALESCE((v_item->>'discount')::numeric, 0),
      ((v_item->>'price')::numeric * v_qty) - COALESCE((v_item->>'discount')::numeric, 0)
    );
  END LOOP;

  -- 3. Customer: redeem points + add credit + earn new points (atomic)
  IF p_customer_id IS NOT NULL THEN
    -- Verify customer ownership
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id AND user_id = v_user_id) THEN
      RAISE EXCEPTION 'Customer not found or access denied';
    END IF;

    -- Redeem points (atomic check)
    IF p_points_to_redeem > 0 THEN
      UPDATE public.customers
      SET points = points - p_points_to_redeem,
          updated_at = now()
      WHERE id = p_customer_id
        AND user_id = v_user_id
        AND points >= p_points_to_redeem;

      GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
      IF v_updated_rows = 0 THEN
        RAISE EXCEPTION 'Insufficient points to redeem';
      END IF;

      INSERT INTO public.points_transactions (customer_id, user_id, type, points, description)
      VALUES (p_customer_id, v_user_id, 'redeem', -p_points_to_redeem, 'استبدال نقاط - فاتورة');
    END IF;

    -- Earn new points
    v_points_earned := FLOOR(p_total * GREATEST(p_points_per_dinar, 1))::integer;
    IF v_points_earned > 0 THEN
      UPDATE public.customers
      SET points = points + v_points_earned, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id;

      INSERT INTO public.points_transactions (customer_id, user_id, type, points, description)
      VALUES (p_customer_id, v_user_id, 'earn', v_points_earned, 'كسب نقاط - فاتورة');
    END IF;

    -- Credit (debt) for credit sales
    IF p_payment_method = 'credit' THEN
      UPDATE public.customers
      SET credit_balance = credit_balance + p_total, updated_at = now()
      WHERE id = p_customer_id AND user_id = v_user_id;
    END IF;
  END IF;

  -- 4. Cash box auto-add (cash sales only)
  IF p_payment_method = 'cash' AND p_auto_add_to_cashbox THEN
    INSERT INTO public.cash_box_transactions (user_id, type, amount, category, description)
    VALUES (v_user_id, 'add', p_total, 'sales', 'مبيعات - فاتورة ' || jsonb_array_length(p_items) || ' منتج');
  END IF;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'points_earned', v_points_earned
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) TO authenticated;