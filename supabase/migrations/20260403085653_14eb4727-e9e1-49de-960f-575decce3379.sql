
ALTER TABLE public.user_settings
  ADD COLUMN store_address_city text,
  ADD COLUMN store_address_street text,
  ADD COLUMN store_address_area text,
  ADD COLUMN commercial_register text,
  ADD COLUMN store_phone text,
  ADD COLUMN store_email text,
  ADD COLUMN business_type text DEFAULT 'kiosk',
  ADD COLUMN store_notes text;
