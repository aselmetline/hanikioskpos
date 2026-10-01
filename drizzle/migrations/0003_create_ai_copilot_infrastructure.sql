-- 1. جدول المعاينات المرحلية للمساعد الذكي
CREATE TABLE public.staged_ai_ingestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('ingestion','update')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','committed','cancelled','expired')),
  idempotency_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  committed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.staged_ai_ingestions TO authenticated;
GRANT ALL ON public.staged_ai_ingestions TO service_role;
ALTER TABLE public.staged_ai_ingestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own staged ingestions" ON public.staged_ai_ingestions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. سجل تدقيق عمليات المساعد الذكي
CREATE TABLE public.ai_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  input_prompt TEXT,
  staged_data JSONB,
  status TEXT NOT NULL DEFAULT 'ok',
  applied_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_actions_log TO authenticated;
GRANT ALL ON public.ai_actions_log TO service_role;
ALTER TABLE public.ai_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ai log" ON public.ai_actions_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own ai log" ON public.ai_actions_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. تسلسل الباركود ودالة توليد باركود فريد
CREATE SEQUENCE IF NOT EXISTS public.product_barcode_seq START 619000000001;

CREATE OR REPLACE FUNCTION public.generate_unique_barcode(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_barcode TEXT;
BEGIN
  LOOP
    v_barcode := nextval('public.product_barcode_seq')::TEXT;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.products WHERE user_id = _user_id AND barcode = v_barcode
    );
  END LOOP;
  RETURN v_barcode;
END;
$function$;
REVOKE ALL ON FUNCTION public.generate_unique_barcode(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_unique_barcode(UUID) TO authenticated, service_role;

-- 4. RPC التثبيت الذري للمعاينات
CREATE OR REPLACE FUNCTION public.commit_staged_ingestion(
  p_preview_id UUID,
  p_idempotency_key UUID,
  p_overrides JSONB DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_stage RECORD;
  v_payload JSONB;
  v_items JSONB;
  v_item JSONB;
  v_supplier_id UUID;
  v_create_purchase BOOLEAN;
  v_payment_method TEXT;
  v_purchase_id UUID;
  v_next_invoice TEXT;
  v_total_purchase NUMERIC(12,3) := 0;
  v_product_id UUID;
  v_name TEXT;
  v_name_ar TEXT;
  v_category TEXT;
  v_unit TEXT;
  v_cost NUMERIC(12,3);
  v_price NUMERIC(12,3);
  v_stock INTEGER;
  v_tax_rate NUMERIC(5,2);
  v_barcode TEXT;
  v_inserted INT := 0;
  v_updated INT := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.has_role(v_user_id, 'admin') OR public.has_role(v_user_id, 'manager')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_stage FROM public.staged_ai_ingestions
  WHERE id = p_preview_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Preview not found or access denied'; END IF;
  IF v_stage.idempotency_key <> p_idempotency_key THEN
    RAISE EXCEPTION 'Idempotency key mismatch';
  END IF;
  IF v_stage.status = 'committed' THEN
    RETURN jsonb_build_object('success', true, 'already_committed', true, 'preview_id', p_preview_id);
  END IF;
  IF v_stage.status <> 'pending' THEN
    RAISE EXCEPTION 'Preview is not pending (status: %)', v_stage.status;
  END IF;
  IF v_stage.expires_at < now() THEN
    UPDATE public.staged_ai_ingestions SET status = 'expired' WHERE id = p_preview_id;
    RAISE EXCEPTION 'Preview expired';
  END IF;

  v_payload := v_stage.payload;
  v_items := COALESCE(p_overrides->'items', v_payload->'items');
  v_supplier_id := NULLIF(COALESCE(p_overrides->>'supplier_id', v_payload->>'supplier_id'), '')::UUID;
  v_create_purchase := COALESCE((p_overrides->>'create_purchase')::BOOLEAN, (v_payload->>'create_purchase')::BOOLEAN, false);
  v_payment_method := COALESCE(p_overrides->>'payment_method', v_payload->>'payment_method', 'cash');
  IF v_payment_method NOT IN ('cash','credit') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'No items to commit';
  END IF;
  IF jsonb_array_length(v_items) > 100 THEN
    RAISE EXCEPTION 'Too many items (max 100)';
  END IF;

  IF v_create_purchase THEN
    SELECT (COALESCE(MAX(NULLIF(invoice_number,'')::INT), 0) + 1)::TEXT INTO v_next_invoice
    FROM public.purchases WHERE user_id = v_user_id AND invoice_number ~ '^[0-9]+$';
    INSERT INTO public.purchases (user_id, invoice_number, invoice_date, supplier_id, total)
    VALUES (v_user_id, v_next_invoice, CURRENT_DATE, v_supplier_id, 0)
    RETURNING id INTO v_purchase_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_product_id := NULLIF(v_item->>'product_id', '')::UUID;
    v_name := LEFT(TRIM(COALESCE(v_item->>'name', '')), 200);
    v_name_ar := LEFT(TRIM(COALESCE(NULLIF(v_item->>'name_ar',''), v_name)), 200);
    v_category := LEFT(COALESCE(NULLIF(v_item->>'category',''), 'عام'), 100);
    v_unit := LEFT(COALESCE(NULLIF(v_item->>'unit',''), 'قطعة'), 50);
    v_cost := ROUND(COALESCE((v_item->>'cost')::NUMERIC, 0), 3);
    v_price := ROUND(COALESCE((v_item->>'price')::NUMERIC, 0), 3);
    v_stock := GREATEST(COALESCE((v_item->>'stock')::INTEGER, 0), 0);
    v_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 19);
    v_barcode := LEFT(COALESCE(v_item->>'barcode', ''), 100);

    IF v_product_id IS NULL AND v_name = '' THEN
      RAISE EXCEPTION 'Item name is required';
    END IF;
    IF v_cost < 0 OR v_price < 0 THEN
      RAISE EXCEPTION 'Prices cannot be negative';
    END IF;
    IF v_tax_rate NOT IN (0, 7, 13, 19) THEN
      RAISE EXCEPTION 'Invalid tax rate: % (must be 0, 7, 13 or 19)', v_tax_rate;
    END IF;

    IF v_product_id IS NOT NULL THEN
      UPDATE public.products
      SET stock = stock + v_stock,
          cost = CASE WHEN v_cost > 0 THEN v_cost ELSE cost END,
          price = CASE WHEN v_price > 0 THEN v_price ELSE price END,
          updated_at = now()
      WHERE id = v_product_id AND user_id = v_user_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Product not found or access denied'; END IF;
      v_updated := v_updated + 1;
    ELSE
      IF v_barcode = '' THEN
        v_barcode := public.generate_unique_barcode(v_user_id);
      END IF;
      INSERT INTO public.products (user_id, name, name_ar, category, unit, cost, price, stock, tax_rate, barcode, low_stock_alert, is_open_price)
      VALUES (v_user_id, v_name, v_name_ar, v_category, v_unit, v_cost, v_price, v_stock, v_tax_rate, v_barcode, 5, false)
      RETURNING id INTO v_product_id;
      v_inserted := v_inserted + 1;
    END IF;

    IF v_create_purchase AND v_stock > 0 THEN
      INSERT INTO public.purchase_items (purchase_id, product_id, product_name, cost, quantity, total)
      VALUES (v_purchase_id, v_product_id, LEFT(COALESCE(NULLIF(v_name_ar,''), v_name), 200), v_cost, v_stock, ROUND(v_cost * v_stock, 3));
      v_total_purchase := v_total_purchase + ROUND(v_cost * v_stock, 3);
    END IF;
  END LOOP;

  IF v_create_purchase THEN
    UPDATE public.purchases SET total = v_total_purchase WHERE id = v_purchase_id;
    IF v_total_purchase > 0 THEN
      IF v_payment_method = 'cash' THEN
        INSERT INTO public.cash_box_transactions (user_id, type, amount, category, description)
        VALUES (v_user_id, 'deduct', v_total_purchase, 'purchases', 'مشتريات - فاتورة ' || v_next_invoice || ' (مساعد ذكي)');
      ELSIF v_payment_method = 'credit' AND v_supplier_id IS NOT NULL THEN
        UPDATE public.suppliers SET debt_balance = debt_balance + v_total_purchase, updated_at = now()
        WHERE id = v_supplier_id AND user_id = v_user_id;
      END IF;
    END IF;
  END IF;

  UPDATE public.staged_ai_ingestions
  SET status = 'committed', committed_at = now()
  WHERE id = p_preview_id;

  INSERT INTO public.ai_actions_log (user_id, action_type, staged_data, status, applied_at)
  VALUES (v_user_id, 'commit_' || v_stage.kind, jsonb_build_object('preview_id', p_preview_id, 'items_count', jsonb_array_length(v_items), 'inserted', v_inserted, 'updated', v_updated, 'purchase_id', v_purchase_id), 'ok', now());

  RETURN jsonb_build_object(
    'success', true,
    'preview_id', p_preview_id,
    'inserted', v_inserted,
    'updated', v_updated,
    'purchase_id', v_purchase_id,
    'purchase_total', v_total_purchase
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.commit_staged_ingestion(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_staged_ingestion(UUID, UUID, JSONB) TO authenticated, service_role;