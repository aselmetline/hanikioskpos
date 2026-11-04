ALTER TABLE public.products ADD COLUMN stock_decimal numeric(10,3), ADD COLUMN low_stock_alert_decimal numeric(10,3);
UPDATE public.products SET stock_decimal = stock, low_stock_alert_decimal = low_stock_alert;
COMMENT ON COLUMN public.products.stock IS 'DEPRECATED: replaced by stock_decimal; compatibility mirror';
COMMENT ON COLUMN public.products.low_stock_alert IS 'DEPRECATED: replaced by low_stock_alert_decimal; compatibility mirror';
ALTER TABLE public.sale_items ADD COLUMN quantity_decimal numeric(10,3), ADD COLUMN product_unit text;
UPDATE public.sale_items SET quantity_decimal = quantity;
ALTER TABLE public.purchase_items ADD COLUMN quantity_decimal numeric(10,3), ADD COLUMN product_unit text;
UPDATE public.purchase_items SET quantity_decimal = quantity;
COMMENT ON COLUMN public.sale_items.quantity IS 'DEPRECATED: replaced by quantity_decimal';
COMMENT ON COLUMN public.purchase_items.quantity IS 'DEPRECATED: replaced by quantity_decimal';
ALTER TABLE public.internal_transfers ADD COLUMN source_quantity_decimal numeric(10,3);
UPDATE public.internal_transfers SET source_quantity_decimal = source_quantity;
COMMENT ON COLUMN public.internal_transfers.source_quantity IS 'DEPRECATED: replaced by source_quantity_decimal';
UPDATE public.sale_items i SET product_unit = p.unit FROM public.products p WHERE i.product_id = p.id;
UPDATE public.purchase_items i SET product_unit = p.unit FROM public.products p WHERE i.product_id = p.id;
CREATE OR REPLACE FUNCTION public.sync_decimal_product_quantities() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.stock_decimal := COALESCE(NEW.stock_decimal, NEW.stock);
  NEW.low_stock_alert_decimal := COALESCE(NEW.low_stock_alert_decimal, NEW.low_stock_alert);
 ELSE
  IF NEW.stock_decimal IS NOT DISTINCT FROM OLD.stock_decimal AND NEW.stock IS DISTINCT FROM OLD.stock THEN
   NEW.stock_decimal := OLD.stock_decimal + (NEW.stock - OLD.stock);
  END IF;
  IF NEW.low_stock_alert_decimal IS NOT DISTINCT FROM OLD.low_stock_alert_decimal AND NEW.low_stock_alert IS DISTINCT FROM OLD.low_stock_alert THEN
   NEW.low_stock_alert_decimal := NEW.low_stock_alert;
  END IF;
 END IF;
 NEW.stock := FLOOR(NEW.stock_decimal);
 NEW.low_stock_alert := FLOOR(NEW.low_stock_alert_decimal);
 RETURN NEW;
END $$;
CREATE TRIGGER sync_decimal_product_quantities BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.sync_decimal_product_quantities();
CREATE OR REPLACE FUNCTION public.sync_decimal_item_quantity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN NEW.quantity_decimal := COALESCE(NEW.quantity_decimal, NEW.quantity);
 ELSIF NEW.quantity_decimal IS NOT DISTINCT FROM OLD.quantity_decimal AND NEW.quantity IS DISTINCT FROM OLD.quantity THEN NEW.quantity_decimal := NEW.quantity;
 END IF;
 IF NEW.quantity_decimal IS NULL OR NEW.quantity_decimal <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
 NEW.quantity := CEIL(NEW.quantity_decimal);
 RETURN NEW;
END $$;
CREATE TRIGGER sync_decimal_sale_quantity BEFORE INSERT OR UPDATE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.sync_decimal_item_quantity();
CREATE TRIGGER sync_decimal_purchase_quantity BEFORE INSERT OR UPDATE ON public.purchase_items FOR EACH ROW EXECUTE FUNCTION public.sync_decimal_item_quantity();
CREATE OR REPLACE FUNCTION public.sync_decimal_transfer_quantity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.source_quantity_decimal := COALESCE(NEW.source_quantity_decimal, NEW.source_quantity);
 NEW.source_quantity := CEIL(NEW.source_quantity_decimal);
 RETURN NEW;
END $$;
CREATE TRIGGER sync_decimal_transfer_quantity BEFORE INSERT ON public.internal_transfers FOR EACH ROW EXECUTE FUNCTION public.sync_decimal_transfer_quantity();
DO $migration$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.process_sale(jsonb,numeric,numeric,numeric,numeric,text,uuid,integer,boolean,integer)'::regprocedure) INTO definition;
 definition := replace(definition, 'v_qty integer;', 'v_qty numeric(10,3);');
 definition := replace(definition, 'v_current_stock integer;', 'v_current_stock numeric(10,3);');
 definition := replace(definition, '(v_item->>''quantity'')::integer', '(v_item->>''quantity'')::numeric');
 definition := replace(definition, 'IF v_qty <= 0 THEN', 'IF v_qty IS NULL OR v_qty <= 0 THEN');
 definition := regexp_replace(definition, '\mstock\M', 'stock_decimal', 'g');
 definition := replace(definition, 'price, quantity, discount, total, tax_rate)', 'price, quantity_decimal, discount, total, tax_rate, product_unit)');
 definition := replace(definition, '(v_price * v_qty) - v_item_discount, v_line_rate);', '(v_price * v_qty) - v_item_discount, v_line_rate, (SELECT unit FROM public.products WHERE id = v_product_id AND user_id = v_user_id));');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.commit_staged_ingestion(uuid,uuid,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition, 'v_stock INTEGER;', 'v_stock NUMERIC(10,3);');
 definition := replace(definition, '(v_item->>''stock'')::INTEGER', '(v_item->>''stock'')::NUMERIC');
 definition := regexp_replace(definition, '\mstock\M', 'stock_decimal', 'g');
 definition := replace(definition, 'v_item->>''stock_decimal''', 'v_item->>''stock''');
 definition := regexp_replace(definition, '\mlow_stock_alert\M', 'low_stock_alert_decimal', 'g');
 definition := replace(definition, 'product_name, cost, quantity, total)', 'product_name, cost, quantity_decimal, total, product_unit)');
 definition := replace(definition, 'v_cost, v_stock, ROUND(v_cost * v_stock, 3));', 'v_cost, v_stock, ROUND(v_cost * v_stock, 3), (SELECT unit FROM public.products WHERE id = v_product_id AND user_id = v_user_id));');
 EXECUTE definition;
 SELECT pg_get_functiondef('public.process_internal_transfer(uuid,integer,uuid,text)'::regprocedure) INTO definition;
 definition := replace(definition, 'public.process_internal_transfer(', 'public.process_internal_transfer_decimal(');
 definition := replace(definition, 'p_source_quantity integer', 'p_source_quantity numeric');
 definition := replace(definition, 'v_src_stock integer;', 'v_src_stock numeric(10,3);');
 definition := regexp_replace(definition, '\mstock\M', 'stock_decimal', 'g');
 definition := regexp_replace(definition, '\msource_quantity\M', 'source_quantity_decimal', 'g');
 definition := replace(definition, 'BEGIN' || chr(10), 'BEGIN' || chr(10) || '  p_source_quantity := ROUND(p_source_quantity, 3);' || chr(10));
 EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.process_internal_transfer_decimal(uuid,numeric,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_internal_transfer_decimal(uuid,numeric,uuid,text) TO authenticated, service_role;