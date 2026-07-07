import { useState, useCallback, useMemo, useEffect } from 'react';
import { Product } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch products from Supabase
  useEffect(() => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await fetchAllPaginated<any>(
        (from, to) => supabase.from('products').select('*').order('created_at', { ascending: false }).range(from, to)
      );

      if (error) {
        console.error('Error fetching products:', error);
        toast.error('خطأ في تحميل المنتجات');
      } else {
        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          nameAr: p.name_ar,
          price: Number(p.price),
          cost: p.cost ? Number(p.cost) : undefined,
          category: p.category,
          barcode: p.barcode || undefined,
          image: p.image_url || undefined,
          stock: p.stock,
          unit: p.unit,
          lowStockAlert: p.low_stock_alert,
          taxRate: p.tax_rate != null ? Number(p.tax_rate) : 0.19,
        })));
      }
      setLoading(false);
    };

    fetchProducts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
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
        category: product.category,
        barcode: product.barcode || null,
        image_url: product.image || null,
        stock: product.stock,
        unit: product.unit,
        low_stock_alert: product.lowStockAlert,
        tax_rate: product.taxRate ?? 0.19,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      toast.error('خطأ في إضافة المنتج');
      return null;
    }

    const newProduct: Product = {
      id: data.id,
      name: data.name,
      nameAr: data.name_ar,
      price: Number(data.price),
      cost: data.cost ? Number(data.cost) : undefined,
      category: data.category,
      barcode: data.barcode || undefined,
      image: data.image_url || undefined,
      stock: data.stock,
      unit: data.unit,
      lowStockAlert: data.low_stock_alert,
      taxRate: data.tax_rate != null ? Number(data.tax_rate) : 0.19,
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
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.barcode !== undefined) dbUpdates.barcode = updates.barcode;
    if (updates.image !== undefined) dbUpdates.image_url = updates.image;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.lowStockAlert !== undefined) dbUpdates.low_stock_alert = updates.lowStockAlert;
    if (updates.taxRate !== undefined) dbUpdates.tax_rate = updates.taxRate;


    const { error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
      toast.error('خطأ في تحديث المنتج');
      return;
    }

    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      toast.error('خطأ في حذف المنتج');
      return;
    }

    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateStock = useCallback(async (id: string, quantity: number, isAddition: boolean = false) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = isAddition ? product.stock + quantity : Math.max(0, product.stock - quantity);

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', id);

    if (error) {
      console.error('Error updating stock:', error);
      return;
    }

    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, stock: newStock } : p
    ));
  }, [products]);

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
    loading
  };
}
