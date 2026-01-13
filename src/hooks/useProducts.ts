import { useState, useCallback, useMemo } from 'react';
import { Product } from '@/types/pos';
import { sampleProducts } from '@/data/sampleData';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString()
    };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const updateStock = useCallback((id: string, quantity: number) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, stock: Math.max(0, p.stock - quantity) } : p
    ));
  }, []);

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
    lowStockProducts
  };
}
