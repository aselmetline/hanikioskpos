import { useState, useEffect, useCallback, useMemo } from 'react';
import { Purchase, PurchaseItem, Product } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';

export const usePurchases = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currentItems, setCurrentItems] = useState<PurchaseItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    const fetchPurchases = async () => {
      setLoading(true);
      const { data, error } = await fetchAllPaginated<Record<string, unknown>>(
        (from, to) => supabase.from('purchases').select('*, purchase_items (*), suppliers (name)').eq('user_id', user.id).order('created_at', { ascending: false }).range(from, to)
      );

      if (error) {
        console.error('Error fetching purchases:', error);
        toast.error('خطأ في تحميل المشتريات');
      } else {
        const mappedPurchases: Purchase[] = data.map(p => {
          const items = p.purchase_items as Array<Record<string, unknown>> | null;
          const supplier = p.suppliers as Record<string, unknown> | null;
          return {
            id: String(p.id),
            invoiceNumber: String(p.invoice_number),
            invoiceDate: new Date(String(p.invoice_date)),
            items: (items || []).map((item) => ({
              product: {
                id: item.product_id ? String(item.product_id) : '',
                name: String(item.product_name),
                nameAr: String(item.product_name),
                price: 0,
                category: '',
                stock: 0,
                unit: '',
                lowStockAlert: 0
              },
              cost: Number(item.cost),
              quantity: Number(item.quantity),
              total: Number(item.total)
            })),
            total: Number(p.total),
            supplierId: p.supplier_id ? String(p.supplier_id) : undefined,
            supplierName: supplier ? String(supplier.name) : undefined,
            createdAt: new Date(String(p.created_at))
          };
        });

        setPurchases(mappedPurchases);

        if (data.length > 0) {
          const maxNumber = Math.max(...data.map(p => parseInt(String(p.invoice_number)) || 0));
          setInvoiceNumber((maxNumber + 1).toString());
        }
      }
      setLoading(false);
    };

    fetchPurchases();

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
      const newItem: PurchaseItem = { product, cost, quantity, total: cost * quantity };
      setCurrentItems(prev => [...prev, newItem]);
    }
  }, [currentItems]);

  const updateItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCurrentItems(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCurrentItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity, total: item.cost * quantity } : item
    ));
  }, []);

  const updateItemCost = useCallback((productId: string, cost: number) => {
    setCurrentItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, cost, total: cost * item.quantity } : item
    ));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCurrentItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const clearCurrentItems = useCallback(() => {
    setCurrentItems([]);
  }, []);

  const savePurchase = useCallback(async (invoiceDate: Date, supplierId?: string): Promise<Purchase | null> => {
    if (!user || currentItems.length === 0) return null;

    const total = currentItems.reduce((sum, item) => sum + item.total, 0);

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate.toISOString().split('T')[0],
      total,
    };
    if (supplierId) insertData.supplier_id = supplierId;

    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert(insertData as { user_id: string; invoice_number: string; invoice_date: string; total: number; supplier_id?: string })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error saving purchase:', purchaseError);
      toast.error('خطأ في حفظ الفاتورة');
      return null;
    }

    const purchaseItems = currentItems.map(item => ({
      purchase_id: purchaseData.id,
      product_id: item.product.id,
      product_name: item.product.nameAr || item.product.name,
      cost: item.cost,
      quantity: item.quantity,
      total: item.total
    }));

    const { error: itemsError } = await supabase.from('purchase_items').insert(purchaseItems);
    if (itemsError) console.error('Error saving purchase items:', itemsError);

    const newPurchase: Purchase = {
      id: purchaseData.id,
      invoiceNumber: purchaseData.invoice_number,
      invoiceDate: new Date(purchaseData.invoice_date),
      items: [...currentItems],
      total,
      supplierId: supplierId,
      createdAt: new Date(purchaseData.created_at)
    };

    setPurchases(prev => [newPurchase, ...prev]);
    setInvoiceNumber((parseInt(invoiceNumber) + 1).toString());
    clearCurrentItems();

    toast.success('تم حفظ فاتورة المشتريات');
    return newPurchase;
  }, [user, currentItems, invoiceNumber, clearCurrentItems]);

  const deletePurchase = useCallback(async (id: string) => {
    if (!user) return;
    // Delete items first, then purchase
    await supabase.from('purchase_items').delete().eq('purchase_id', id);
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) {
      toast.error('خطأ في حذف الفاتورة');
      return;
    }
    setPurchases(prev => prev.filter(p => p.id !== id));
    toast.success('تم حذف فاتورة المشتريات');
  }, [user]);

  const updatePurchase = useCallback(async (
    id: string,
    items: PurchaseItem[],
    invoiceDate: Date,
    supplierId?: string
  ): Promise<boolean> => {
    if (!user || items.length === 0) return false;
    const total = items.reduce((s, it) => s + it.total, 0);

    const { error: upErr } = await supabase
      .from('purchases')
      .update({
        invoice_date: invoiceDate.toISOString().split('T')[0],
        supplier_id: supplierId || null,
        total,
      })
      .eq('id', id);
    if (upErr) { toast.error('خطأ في تحديث الفاتورة'); return false; }

    await supabase.from('purchase_items').delete().eq('purchase_id', id);
    const rows = items.map(item => ({
      purchase_id: id,
      product_id: item.product.id,
      product_name: item.product.nameAr || item.product.name,
      cost: item.cost,
      quantity: item.quantity,
      total: item.total,
    }));
    const { error: itemsErr } = await supabase.from('purchase_items').insert(rows);
    if (itemsErr) { toast.error('خطأ في تحديث بنود الفاتورة'); return false; }

    setPurchases(prev => prev.map(p => p.id === id ? {
      ...p,
      invoiceDate,
      supplierId,
      items: [...items],
      total,
    } : p));
    toast.success('تم تحديث الفاتورة');
    return true;
  }, [user]);

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
    updatePurchase,
    deletePurchase,
    loading
  };
};

