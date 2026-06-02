-- Add external_id column to customers (deterministic per-user customer identifier)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS external_id text;

-- Uniqueness is per-user (each tenant has its own namespace of customer IDs)
CREATE UNIQUE INDEX IF NOT EXISTS customers_user_external_id_unique
  ON public.customers (user_id, external_id)
  WHERE external_id IS NOT NULL;

-- Helpful lookup index (covered by the unique one above, but keep an explicit hint)
CREATE INDEX IF NOT EXISTS customers_external_id_idx
  ON public.customers (external_id)
  WHERE external_id IS NOT NULL;