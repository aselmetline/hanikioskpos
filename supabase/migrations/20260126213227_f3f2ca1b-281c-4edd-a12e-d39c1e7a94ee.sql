-- =============================================
-- PROFILES TABLE (للمستخدمين)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- PRODUCTS TABLE (المنتجات والمخزون)
-- =============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  cost DECIMAL(10,3) DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'daily',
  barcode TEXT,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'قطعة',
  low_stock_alert INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CUSTOMERS TABLE (العملاء)
-- =============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  credit_balance DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customers" ON public.customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers" ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers" ON public.customers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers" ON public.customers
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SALES TABLE (المبيعات)
-- =============================================
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,3) NOT NULL DEFAULT 0,
  tax DECIMAL(10,3) NOT NULL DEFAULT 0,
  discount DECIMAL(10,3) NOT NULL DEFAULT 0,
  total DECIMAL(10,3) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sales" ON public.sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales" ON public.sales
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SALE_ITEMS TABLE (عناصر المبيعات)
-- =============================================
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,3) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  discount DECIMAL(10,3) NOT NULL DEFAULT 0,
  total DECIMAL(10,3) NOT NULL DEFAULT 0
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sale items" ON public.sale_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales WHERE id = sale_items.sale_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales WHERE id = sale_items.sale_id AND user_id = auth.uid())
  );

-- =============================================
-- PURCHASES TABLE (المشتريات)
-- =============================================
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases" ON public.purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own purchases" ON public.purchases
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PURCHASE_ITEMS TABLE (عناصر المشتريات)
-- =============================================
CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  cost DECIMAL(10,3) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total DECIMAL(10,3) NOT NULL DEFAULT 0
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchase items" ON public.purchase_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.purchases WHERE id = purchase_items.purchase_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own purchase items" ON public.purchase_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.purchases WHERE id = purchase_items.purchase_id AND user_id = auth.uid())
  );

-- =============================================
-- EXPENSES TABLE (المصروفات)
-- =============================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CASH_BOX_TRANSACTIONS TABLE (معاملات الصندوق)
-- =============================================
CREATE TABLE public.cash_box_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'deduct')),
  amount DECIMAL(10,3) NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_box_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.cash_box_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.cash_box_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON public.cash_box_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- SETTINGS TABLE (إعدادات المستخدم)
-- =============================================
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  kiosk_name TEXT DEFAULT 'كشك هاني',
  kiosk_name_fr TEXT DEFAULT 'Hani Kiosk',
  logo_url TEXT,
  tax_rate DECIMAL(5,2) DEFAULT 0.19,
  currency TEXT DEFAULT 'TND',
  printer_width TEXT DEFAULT '58mm',
  printer_enabled BOOLEAN DEFAULT false,
  printer_ip TEXT,
  points_per_dinar INTEGER DEFAULT 1,
  low_stock_threshold INTEGER DEFAULT 10,
  whatsapp_number TEXT,
  auto_add_sales BOOLEAN DEFAULT true,
  auto_deduct_purchases BOOLEAN DEFAULT true,
  auto_deduct_expenses BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- TRIGGER: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();