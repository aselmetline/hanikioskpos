-- Ensure SECURITY DEFINER functions are not callable by anonymous/public roles
REVOKE ALL ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.record_customer_payment(uuid, numeric, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid, numeric, text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.get_vat_report(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vat_report(integer, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.next_invoice_number(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;