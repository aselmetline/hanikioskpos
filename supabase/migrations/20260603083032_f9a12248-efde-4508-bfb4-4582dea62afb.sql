-- Add opening_debt_balance column to customers table
ALTER TABLE public.customers
ADD COLUMN opening_debt_balance NUMERIC NOT NULL DEFAULT 0;

-- Index for faster lookups by opening debt (optional but useful for reports)
CREATE INDEX idx_customers_opening_debt ON public.customers(opening_debt_balance) WHERE opening_debt_balance > 0;