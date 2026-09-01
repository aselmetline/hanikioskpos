CREATE OR REPLACE FUNCTION public.process_internal_transfer(p_source_product_id uuid, p_source_quantity integer, p_target_product_id uuid, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_src_price numeric;
  v_src_name text;
  v_src_stock integer;
  v_tgt_price numeric;
  v_tgt_name text;
  v_total_value numeric;
  v_tgt_qty integer;
  v_remainder numeric;
  v_updated integer;
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_source_product_id IS NULL OR p_target_product_id IS NULL THEN RAISE EXCEPTION 'Source and target products are required'; END IF;
  IF p_source_product_id = p_target_product_id THEN RAISE EXCEPTION 'Source and target must be different products'; END IF;
  IF p_source_quantity IS NULL OR p_source_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;

  -- Internal transfers are valued at PURCHASE cost (fallback to price when cost is missing)
  SELECT COALESCE(NULLIF(cost, 0), price), COALESCE(NULLIF(name_ar,''), name), stock
    INTO v_src_price, v_src_name, v_src_stock
  FROM public.products WHERE id = p_source_product_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source product not found or access denied'; END IF;

  SELECT COALESCE(NULLIF(cost, 0), price), COALESCE(NULLIF(name_ar,''), name)
    INTO v_tgt_price, v_tgt_name
  FROM public.products WHERE id = p_target_product_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target product not found or access denied'; END IF;
  IF v_tgt_price IS NULL OR v_tgt_price <= 0 THEN RAISE EXCEPTION 'Target product must have a positive purchase cost'; END IF;

  v_total_value := ROUND(v_src_price * p_source_quantity, 3);
  v_tgt_qty := FLOOR(v_total_value / v_tgt_price)::integer;
  v_remainder := ROUND(v_total_value - (v_tgt_qty * v_tgt_price), 3);
  IF v_tgt_qty <= 0 THEN RAISE EXCEPTION 'Source value is not enough for one unit of the target product'; END IF;

  UPDATE public.products
  SET stock = stock - p_source_quantity, updated_at = now()
  WHERE id = p_source_product_id AND user_id = v_user_id AND stock >= p_source_quantity;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product %: available %, requested %', v_src_name, v_src_stock, p_source_quantity;
  END IF;

  UPDATE public.products
  SET stock = stock + v_tgt_qty, updated_at = now()
  WHERE id = p_target_product_id AND user_id = v_user_id;

  INSERT INTO public.internal_transfers (
    user_id, source_product_id, source_product_name, source_quantity, source_unit_value, source_total_value,
    target_product_id, target_product_name, target_unit_price, target_quantity, remainder_value, notes
  ) VALUES (
    v_user_id, p_source_product_id, LEFT(v_src_name, 200), p_source_quantity, v_src_price, v_total_value,
    p_target_product_id, LEFT(v_tgt_name, 200), v_tgt_price, v_tgt_qty, GREATEST(v_remainder, 0), LEFT(p_notes, 500)
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'transfer_id', v_id,
    'source_total_value', v_total_value,
    'target_quantity', v_tgt_qty,
    'remainder_value', GREATEST(v_remainder, 0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.process_internal_transfer(uuid, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_internal_transfer(uuid, integer, uuid, text) TO authenticated;