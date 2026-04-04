-- Allow users to delete their own sale items
CREATE POLICY "Users can delete own sale items"
ON public.sale_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM sales
  WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()
));

-- Allow users to delete their own purchase items
CREATE POLICY "Users can delete own purchase items"
ON public.purchase_items
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM purchases
  WHERE purchases.id = purchase_items.purchase_id AND purchases.user_id = auth.uid()
));

-- Allow users to delete their own points transactions
CREATE POLICY "Users can delete own points transactions"
ON public.points_transactions
FOR DELETE
USING (auth.uid() = user_id);