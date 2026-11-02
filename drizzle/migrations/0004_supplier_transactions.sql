CREATE TABLE public.supplier_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  from_cashbox boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supplier_transactions TO authenticated;
GRANT ALL ON public.supplier_transactions TO service_role;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own supplier tx select" ON public.supplier_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ON public.supplier_transactions (supplier_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_supplier_transaction(p_supplier_id uuid, p_type text, p_amount numeric, p_notes text DEFAULT NULL, p_from_cashbox boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text;
  v_bal numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_type NOT IN ('debt','payment') THEN RAISE EXCEPTION 'Invalid type'; END IF;

  UPDATE public.suppliers
  SET debt_balance = CASE WHEN p_type='debt' THEN debt_balance + p_amount ELSE GREATEST(debt_balance - p_amount, 0) END,
      updated_at = now()
  WHERE id = p_supplier_id AND user_id = v_user
  RETURNING name, debt_balance INTO v_name, v_bal;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found'; END IF;

  INSERT INTO public.supplier_transactions (user_id, supplier_id, type, amount, balance_after, from_cashbox, notes)
  VALUES (v_user, p_supplier_id, p_type, p_amount, v_bal, p_type='payment' AND p_from_cashbox, p_notes)
  RETURNING id INTO v_id;

  IF p_type='payment' AND p_from_cashbox THEN
    INSERT INTO public.cash_box_transactions (user_id, type, amount, category, description)
    VALUES (v_user, 'deduct', p_amount, 'supplier_payment', 'تسديد مورد - ' || COALESCE(v_name,''));
  END IF;

  RETURN jsonb_build_object('id', v_id, 'balance', v_bal);
END; $$;
REVOKE ALL ON FUNCTION public.record_supplier_transaction(uuid,text,numeric,text,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_supplier_transaction(uuid,text,numeric,text,boolean) TO authenticated;