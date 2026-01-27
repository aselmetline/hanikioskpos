import { useState, useEffect, useCallback, useMemo } from 'react';
import { Purchase, PurchaseItem, Product } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const usePurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currentItems, setCurrentItems] = useState<PurchaseItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('1');
  const [loading, setLoading] = useState(true);

  // Fetch purchases from Supabase
  useEffect(() => {
    if (!user) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          purchase_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchases:', error);
        toast.error('خطأ في تحميل المشتريات');
      } else {
        const mappedPurchases: Purchase[] = data.map(p => ({
          id: p.id,
          invoiceNumber: p.invoice_number,
          invoiceDate: new Date(p.invoice_date),
          items: (p.purchase_items || []).map((item: { product_id: string | null; product_name: string; cost: number; quantity: number; total: number }) => ({
            product: {
              id: item.product_id || '',
              name: item.product_name,
              nameAr: item.product_name,
              price: 0,
              category: '',
              stock: 0,
              unit: '',
              lowStockAlert: 0
            },
            cost: Number(item.cost),
            quantity: item.quantity,
            total: Number(item.total)
          })),
          total: Number(p.total),
          createdAt: new Date(p.created_at)
        }));

        setPurchases(mappedPurchases);

        // Set next invoice number
        if (data.length > 0) {
          const maxNumber = Math.max(...data.map(p => parseInt(p.invoice_number) || 0));
          setInvoiceNumber((maxNumber + 1).toString());
        }
      }
      setLoading(false);
    };

    fetchPurchases();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('purchases-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => {
        fetchPurchases();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addItemToPurchase = useCallback((product: Product, cost: number, quantity: number) => {
    const existingIndex = currentItems.findIndex(item => item.product.id === product.id);
    
    if (existingIndex >= 0) {
      setCurrentItems(prev => prev.map((item, index) => 
        index === existingIndex 
          ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.cost }
          : item
      ));
    } else {
      const newItem: PurchaseItem = {
        product,
        cost,
        quantity,
        total: cost * quantity
      };
      setCurrentItems(prev => [...prev, newItem]);
    }
  }, [currentItems]);

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCurrentItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity, total: item.cost * quantity }
        : item
    ));
  }, []);

  const updateItemCost = useCallback((productId: string, cost: number) => {
    setCurrentItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, cost, total: cost * item.quantity }
        : item
    ));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCurrentItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const clearCurrentItems = useCallback(() => {
    setCurrentItems([]);
  }, []);

  const savePurchase = useCallback(async (invoiceDate: Date): Promise<Purchase | null> => {
    if (!user || currentItems.length === 0) return null;

    const total = currentItems.reduce((sum, item) => sum + item.total, 0);

    // Insert purchase
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate.toISOString().split('T')[0],
        total
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error saving purchase:', purchaseError);
      toast.error('خطأ في حفظ الفاتورة');
      return null;
    }

    // Insert purchase items
    const purchaseItems = currentItems.map(item => ({
      purchase_id: purchaseData.id,
      product_id: item.product.id,
      product_name: item.product.nameAr || item.product.name,
      cost: item.cost,
      quantity: item.quantity,
      total: item.total
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems);

    if (itemsError) {
      console.error('Error saving purchase items:', itemsError);
    }

    const newPurchase: Purchase = {
      id: purchaseData.id,
      invoiceNumber: purchaseData.invoice_number,
      invoiceDate: new Date(purchaseData.invoice_date),
      items: [...currentItems],
      total,
      createdAt: new Date(purchaseData.created_at)
    };

    setPurchases(prev => [newPurchase, ...prev]);
    setInvoiceNumber((parseInt(invoiceNumber) + 1).toString());
    clearCurrentItems();

    toast.success('تم حفظ فاتورة المشتريات');
    return newPurchase;
  }, [user, currentItems, invoiceNumber, clearCurrentItems]);

  const currentTotal = useMemo(() => {
    return currentItems.reduce((sum, item) => sum + item.total, 0);
  }, [currentItems]);

  return {
    purchases,
    currentItems,
    currentTotal,
    invoiceNumber,
    setInvoiceNumber,
    addItemToPurchase,
    updateItemQuantity,
    updateItemCost,
    removeItem,
    clearCurrentItems,
    savePurchase,
    loading
  };
};
