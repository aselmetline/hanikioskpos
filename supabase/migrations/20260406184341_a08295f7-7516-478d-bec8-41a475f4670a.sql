-- Add UPDATE policy for cash_box_transactions
CREATE POLICY "Users can update own transactions"
ON public.cash_box_transactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Add UPDATE policy for purchase_items
CREATE POLICY "Users can update own purchase items"
ON public.purchase_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM purchases
  WHERE purchases.id = purchase_items.purchase_id
  AND purchases.user_id = auth.uid()
));

-- Add UPDATE policy for sale_items
CREATE POLICY "Users can update own sale items"
ON public.sale_items
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM sales
  WHERE sales.id = sale_items.sale_id
  AND sales.user_id = auth.uid()
));