import { useState, useEffect, useCallback } from 'react';
import { Sale, CartItem, Customer } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useSales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sales from Supabase
  useEffect(() => {
    if (!user) {
      setSales([]);
      setLoading(false);
      return;
    }

    const fetchSales = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales:', error);
        toast.error('خطأ في تحميل المبيعات');
      } else {
        const mappedSales: Sale[] = data.map(s => ({
          id: s.id,
          items: (s.sale_items || []).map((item: { product_id: string | null; product_name: string; price: number; quantity: number; discount: number }) => ({
            product: {
              id: item.product_id || '',
              name: item.product_name,
              nameAr: item.product_name,
              price: Number(item.price),
              category: '',
              stock: 0,
              unit: '',
              lowStockAlert: 0
            },
            quantity: item.quantity,
            discount: Number(item.discount)
          })),
          subtotal: Number(s.subtotal),
          tax: Number(s.tax),
          discount: Number(s.discount),
          total: Number(s.total),
          paymentMethod: s.payment_method as 'cash' | 'credit',
          customerId: s.customer_id || undefined,
          createdAt: new Date(s.created_at)
        }));

        setSales(mappedSales);
      }
      setLoading(false);
    };

    fetchSales();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('sales-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createSale = useCallback(async (
    items: CartItem[],
    subtotal: number,
    tax: number,
    discount: number,
    total: number,
    paymentMethod: 'cash' | 'credit',
    customer?: Customer
  ): Promise<Sale | null> => {
    if (!user || items.length === 0) return null;

    // Insert sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: user.id,
        subtotal,
        tax,
        discount,
        total,
        payment_method: paymentMethod,
        customer_id: customer?.id || null
      })
      .select()
      .single();

    if (saleError) {
      console.error('Error creating sale:', saleError);
      toast.error('خطأ في تسجيل البيع');
      return null;
    }

    // Insert sale items
    const saleItems = items.map(item => ({
      sale_id: saleData.id,
      product_id: item.product.id,
      product_name: item.product.nameAr || item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      discount: item.discount,
      total: (item.product.price * item.quantity) - item.discount
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Error saving sale items:', itemsError);
    }

    const newSale: Sale = {
      id: saleData.id,
      items: [...items],
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      customerId: customer?.id,
      createdAt: new Date(saleData.created_at)
    };

    setSales(prev => [newSale, ...prev]);
    return newSale;
  }, [user]);

  return {
    sales,
    createSale,
    loading
  };
};
