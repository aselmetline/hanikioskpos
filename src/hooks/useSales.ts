import { useState, useEffect, useCallback } from 'react';
import { Sale, CartItem, Customer } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';

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
      const { data, error } = await fetchAllPaginated<any>(
        (from, to) => supabase.from('sales').select('*, sale_items (*)').order('created_at', { ascending: false }).range(from, to)
      );

      if (error) {
        console.error('Error fetching sales:', error);
        toast.error('خطأ في تحميل المبيعات');
      } else {
        const mappedSales: Sale[] = data.map(s => ({
          id: s.id,
          items: (s.sale_items || []).map((item: { product_id: string | null; product_name: string; price: number; quantity: number; discount: number; tax_rate?: number }) => ({
            product: {
              id: item.product_id || '',
              name: item.product_name,
              nameAr: item.product_name,
              price: Number(item.price),
              category: '',
              stock: 0,
              unit: '',
              lowStockAlert: 0,
              taxRate: item.tax_rate != null ? Number(item.tax_rate) : 0.19,
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
          createdAt: new Date(s.created_at),
          invoiceNumber: s.invoice_number ?? null,
          fiscalStamp: s.fiscal_stamp != null ? Number(s.fiscal_stamp) : 0,
          taxBreakdown: (s.tax_breakdown as Record<string, { base: number; tax: number }>) || undefined,
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
    customer?: Customer,
    options?: {
      pointsToRedeem?: number;
      autoAddToCashbox?: boolean;
      pointsPerDinar?: number;
    }
  ): Promise<{ sale: Sale; pointsEarned: number; invoiceNumber?: number; fiscalStamp?: number; taxBreakdown?: Record<string, { base: number; tax: number }> } | null> => {
    if (!user || items.length === 0) return null;

    const payload = items.map(item => ({
      product_id: item.product.id || null,
      product_name: item.product.nameAr || item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      tax_rate: item.product.taxRate ?? 0.19,
    }));

    const { data, error } = await supabase.rpc('process_sale', {
      p_items: payload,
      p_subtotal: subtotal,
      p_tax: tax,
      p_discount: discount,
      p_total: total,
      p_payment_method: paymentMethod,
      p_customer_id: customer?.id ?? null,
      p_points_to_redeem: options?.pointsToRedeem ?? 0,
      p_auto_add_to_cashbox: options?.autoAddToCashbox ?? false,
      p_points_per_dinar: options?.pointsPerDinar ?? 1,
    });

    if (error) {
      console.error('Error creating sale:', error);
      const msg = error.message || '';
      if (msg.includes('CREDIT_LIMIT_EXCEEDED')) {
        toast.error('تم تجاوز الحد الائتماني المسموح لهذا العميل');
      } else {
        toast.error(msg || 'خطأ في تسجيل البيع');
      }
      return null;
    }

    const result = data as {
      sale_id: string;
      points_earned: number;
      total: number;
      invoice_number?: number;
      fiscal_stamp?: number;
      tax_breakdown?: Record<string, { base: number; tax: number }>;
    };

    const newSale: Sale = {
      id: result.sale_id,
      items: [...items],
      subtotal,
      tax,
      discount,
      total: result.total ?? total,
      paymentMethod,
      customerId: customer?.id,
      createdAt: new Date(),
      invoiceNumber: result.invoice_number ?? null,
      fiscalStamp: result.fiscal_stamp ?? 0,
      taxBreakdown: result.tax_breakdown,
    };

    setSales(prev => [newSale, ...prev]);
    return {
      sale: newSale,
      pointsEarned: result.points_earned,
      invoiceNumber: result.invoice_number,
      fiscalStamp: result.fiscal_stamp,
      taxBreakdown: result.tax_breakdown,
    };
  }, [user]);

  return {
    sales,
    createSale,
    loading
  };
};
