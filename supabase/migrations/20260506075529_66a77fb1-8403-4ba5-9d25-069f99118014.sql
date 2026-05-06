
-- process_sale: only authenticated users
REVOKE ALL ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb, numeric, numeric, numeric, numeric, text, uuid, integer, boolean, integer) TO authenticated;

-- handle_new_user: trigger only, no direct callers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- update_updated_at_column: trigger only
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
