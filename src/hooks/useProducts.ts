import { addQuantity, roundQuantity } from '@/lib/quantity';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Product } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';
import { tx } from '@/i18n/t';
import {
  loadCache,
  saveCache,
  OFFLINE_STOCK_EVENT,
  type OfflineStockDelta,
} from '@/lib/offlineCache';
import { subscribeRevalidate } from '@/lib/cacheRevalidate';
import { enqueueMutation } from '@/lib/offlineMutations';
import { isNetworkError } from '@/lib/offlineQueue';

/** Captures the pre-edit values of the columns being changed (conflict baseline). */
function snapshotBase(product: Product, dbUpdates: Record<string, unknown>) {
  const map: Record<string, unknown> = {
    name: product.name,
    name_ar: product.nameAr,
    price: product.price,
    cost: product.cost ?? 0,
    category: product.category,
    barcode: product.barcode ?? null,
    image_url: product.image ?? null,
    stock_decimal: product.stock,
    unit: product.unit,
    low_stock_alert_decimal: product.lowStockAlert,
    tax_rate: product.taxRate ?? 0.19,
    is_open_price: product.isOpenPrice ?? false,
  };
  const base: Record<string, unknown> = {};
  Object.keys(dbUpdates).forEach(k => { base[k] = map[k]; });
  base.stock_decimal = product.stock;
  return base;
}

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineData, setOfflineData] = useState(false);
  const hydratedRef = useRef(false);
  const productsRef = useRef<Product[]>([]);
  productsRef.current = products;

  // Keep the offline cache in sync with whatever the sell screen is showing.
  useEffect(() => {
    if (!user || !hydratedRef.current) return;
    saveCache('products', user.id, products);
  }, [products, user]);

  // Apply local stock deductions for sales queued while offline.
  useEffect(() => {
    const handler = (e: Event) => {
      const deltas = (e as CustomEvent<OfflineStockDelta[]>).detail || [];
      if (deltas.length === 0) return;
      setProducts(prev =>
        prev.map(p => {
          const d = deltas.find(x => x.productId === p.id);
          return d ? { ...p, stock: Math.max(0, addQuantity(p.stock, -d.quantity)) } : p;
        }),
      );
    };
    window.addEventListener(OFFLINE_STOCK_EVENT, handler);
    return () => window.removeEventListener(OFFLINE_STOCK_EVENT, handler);
  }, []);

  // Fetch products from Supabase (with IndexedDB pre-load for offline use)
  useEffect(() => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    hydratedRef.current = false;

    const hydrateFromCache = async () => {
      const cached = await loadCache<Product[]>('products', user.id);
      if (cancelled || !cached?.data?.length) return false;
      setProducts(prev => (prev.length ? prev : cached.data));
      setLoading(false);
      return true;
    };

    const fetchProducts = async () => {
      const { data, error } = await fetchAllPaginated<any>(
        (from, to) => supabase.from('products').select('*').order('created_at', { ascending: false }).range(from, to)
      );
      if (cancelled) return;

      if (error) {
        console.error('Error fetching products:', error);
        const cached = await loadCache<Product[]>('products', user.id);
        if (cancelled) return;
        if (cached?.data?.length) {
          setProducts(cached.data);
          setOfflineData(true);
        } else {
          toast.error(tx('errors.loadProducts'));
        }
      } else {
        setOfflineData(false);
        hydratedRef.current = true;
        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          nameAr: p.name_ar,
          price: Number(p.price),
          cost: p.cost ? Number(p.cost) : undefined,
          price2: p.price2 ? Number(p.price2) : undefined,
          price3: p.price3 ? Number(p.price3) : undefined,
          category: p.category,
          barcode: p.barcode || undefined,
          image: p.image_url || undefined,
          stock: Number(p.stock_decimal ?? p.stock),
          unit: p.unit,
          lowStockAlert: Number(p.low_stock_alert_decimal ?? p.low_stock_alert),
          taxRate: p.tax_rate != null ? Number(p.tax_rate) : 0.19,
          isOpenPrice: !!p.is_open_price,
          hasSubUnits: !!p.has_sub_units,
          subUnitName: p.sub_unit_name || undefined,
          subUnitsCount: p.sub_units_count ?? undefined,
          subUnitPrice: p.sub_unit_price != null ? Number(p.sub_unit_price) : undefined,
          looseStock: Number(p.loose_stock ?? 0),
        })));
      }
      setLoading(false);
    };

    setLoading(true);
    hydrateFromCache().then(() => fetchProducts());

    // Smart cache policy: refresh when back online / visible / stale.
    const unsubscribe = subscribeRevalidate(fetchProducts);

    // Subscribe to realtime changes
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      cancelled = true;
      unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nameAr.includes(searchQuery) ||
        product.barcode?.includes(searchQuery);
      
      const matchesCategory = selectedCategory === null || 
        product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        name: product.name,
        name_ar: product.nameAr,
        price: product.price,
        cost: product.cost || 0,
        price2: product.price2 ?? null,
        price3: product.price3 ?? null,
        category: product.category,
        barcode: product.barcode || null,
        image_url: product.image || null,
        stock_decimal: product.stock,
        unit: product.unit,
        low_stock_alert_decimal: product.lowStockAlert,
        tax_rate: product.taxRate ?? 0.19,
        is_open_price: product.isOpenPrice ?? false,
        has_sub_units: product.hasSubUnits ?? false,
        sub_unit_name: product.subUnitName ?? 'سيجارة',
        sub_units_count: product.subUnitsCount ?? 20,
        sub_unit_price: product.subUnitPrice ?? null,
        loose_stock: product.looseStock ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      toast.error(tx('errors.addProduct'));
      return null;
    }

    const newProduct: Product = {
      id: data.id,
      name: data.name,
      nameAr: data.name_ar,
      price: Number(data.price),
      cost: data.cost ? Number(data.cost) : undefined,
      price2: data.price2 ? Number(data.price2) : undefined,
      price3: data.price3 ? Number(data.price3) : undefined,
      category: data.category,
      barcode: data.barcode || undefined,
      image: data.image_url || undefined,
      stock: Number(data.stock_decimal ?? data.stock),
      unit: data.unit,
      lowStockAlert: Number(data.low_stock_alert_decimal ?? data.low_stock_alert),
      taxRate: data.tax_rate != null ? Number(data.tax_rate) : 0.19,
      isOpenPrice: !!data.is_open_price,
      hasSubUnits: !!data.has_sub_units,
      subUnitName: data.sub_unit_name || undefined,
      subUnitsCount: data.sub_units_count ?? undefined,
      subUnitPrice: data.sub_unit_price != null ? Number(data.sub_unit_price) : undefined,
      looseStock: Number(data.loose_stock ?? 0),
    };

    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  }, [user]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.nameAr !== undefined) dbUpdates.name_ar = updates.nameAr;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
    if ('price2' in updates) dbUpdates.price2 = updates.price2 ?? null;
    if ('price3' in updates) dbUpdates.price3 = updates.price3 ?? null;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.image !== undefined) dbUpdates.image_url = updates.image;
    if (updates.stock !== undefined) dbUpdates.stock_decimal = roundQuantity(updates.stock);
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.lowStockAlert !== undefined) dbUpdates.low_stock_alert_decimal = roundQuantity(updates.lowStockAlert);
    if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;
    if (updates.isOpenPrice !== undefined) dbUpdates.is_open_price = updates.isOpenPrice;
    if (updates.hasSubUnits !== undefined) dbUpdates.has_sub_units = updates.hasSubUnits;
    if (updates.subUnitName !== undefined) dbUpdates.sub_unit_name = updates.subUnitName;
    if (updates.subUnitsCount !== undefined) dbUpdates.sub_units_count = updates.subUnitsCount;
    if ('subUnitPrice' in updates) dbUpdates.sub_unit_price = updates.subUnitPrice ?? null;
    if (updates.looseStock !== undefined) dbUpdates.loose_stock = roundQuantity(updates.looseStock);


    const current = productsRef.current.find(p => p.id === id);
    const base = current ? snapshotBase(current, dbUpdates) : {};
    const stockDelta =
      updates.stock !== undefined && current ? addQuantity(updates.stock, -current.stock) : 0;

    const applyLocally = () =>
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));

    if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
      enqueueMutation({ userId: user.id, productId: id, kind: 'update', fields: dbUpdates, base, stockDelta });
      applyLocally();
      toast.info(tx('offline.editQueued'));
      return;
    }

    const { error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      if (isNetworkError(error) && user) {
        enqueueMutation({ userId: user.id, productId: id, kind: 'update', fields: dbUpdates, base, stockDelta });
        applyLocally();
        toast.info(tx('offline.editQueued'));
        return;
      }
      console.error('Error updating product:', error);
      toast.error(tx('errors.updateProduct'));
      return;
    }

    applyLocally();
  }, [user]);

  const deleteProduct = useCallback(async (id: string) => {
    const removeLocally = () => setProducts(prev => prev.filter(p => p.id !== id));

    if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
      enqueueMutation({ userId: user.id, productId: id, kind: 'delete' });
      removeLocally();
      toast.info(tx('offline.editQueued'));
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      if (isNetworkError(error) && user) {
        enqueueMutation({ userId: user.id, productId: id, kind: 'delete' });
        removeLocally();
        toast.info(tx('offline.editQueued'));
        return;
      }
      console.error('Error deleting product:', error);
      toast.error(tx('errors.deleteProduct'));
      return;
    }

    removeLocally();
  }, [user]);

  const updateStock = useCallback(async (id: string, quantity: number, isAddition: boolean = false) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = isAddition ? addQuantity(product.stock, quantity) : Math.max(0, addQuantity(product.stock, -quantity));
    const stockDelta = addQuantity(newStock, -product.stock);

    const applyLocally = () =>
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, stock: newStock } : p)));

    const queueOffline = () => {
      if (!user) return;
      // Stock is queued as a *delta* so concurrent changes from other devices
      // are merged instead of overwritten at sync time.
      enqueueMutation({
        userId: user.id,
        productId: id,
        kind: 'stock',
        fields: { stock_decimal: newStock },
        base: { stock_decimal: product.stock },
        stockDelta,
      });
      applyLocally();
      toast.info(tx('offline.editQueued'));
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine && user) {
      queueOffline();
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ stock_decimal: newStock })
      .eq('id', id);

    if (error) {
      if (isNetworkError(error) && user) {
        queueOffline();
        return;
      }
      console.error('Error updating stock:', error);
      return;
    }

    applyLocally();
  }, [products, user]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.lowStockAlert && p.lowStockAlert > 0);
  }, [products]);

  return {
    products,
    filteredProducts,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    lowStockProducts,
    offlineData,
    loading
  };
}
