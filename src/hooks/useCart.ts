import { useState, useCallback, useMemo } from 'react';
import { CartItem, Product } from '@/types/pos';

export function useCart(taxRate: number = 0.19, taxEnabled: boolean = true) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }
      return [...prev, { product, quantity, discount: 0 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  }, [removeItem]);

  const updateItemDiscount = useCallback((productId: string, discount: number) => {
    setItems(prev => prev.map(item =>
      item.product.id === productId ? { ...item, discount } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setGlobalDiscount(0);
  }, []);

  const { subtotal, itemsDiscount, taxableAmount, tax, total, itemCount } = useMemo(() => {
    const subtotal = items.reduce((sum, item) => 
      sum + (item.product.price * item.quantity), 0
    );
    
    const itemsDiscount = items.reduce((sum, item) => 
      sum + item.discount, 0
    );
    
    const afterDiscount = subtotal - itemsDiscount - globalDiscount;
    const taxableAmount = Math.max(0, afterDiscount);
    const tax = taxEnabled ? taxableAmount * taxRate : 0;
    const total = taxableAmount + tax;
    
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, itemsDiscount, taxableAmount, tax, total, itemCount };
  }, [items, globalDiscount, taxRate, taxEnabled]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    clearCart,
    globalDiscount,
    setGlobalDiscount,
    subtotal,
    itemsDiscount,
    taxableAmount,
    tax,
    total,
    itemCount
  };
}
