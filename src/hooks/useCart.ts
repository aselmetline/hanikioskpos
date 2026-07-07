import { useState, useCallback, useMemo } from 'react';
import { CartItem, Product } from '@/types/pos';

export function useCart(defaultTaxRate: number = 0.19, taxEnabled: boolean = true) {
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

  const { subtotal, itemsDiscount, taxableAmount, tax, total, itemCount, taxBreakdown } = useMemo(() => {
    const subtotal = items.reduce((sum, item) =>
      sum + (item.product.price * item.quantity), 0
    );

    const itemsDiscount = items.reduce((sum, item) => sum + item.discount, 0);

    const preDiscountSubtotal = subtotal - itemsDiscount;
    const safeGlobal = Math.min(Math.max(globalDiscount, 0), preDiscountSubtotal);
    const ratio = preDiscountSubtotal > 0 ? safeGlobal / preDiscountSubtotal : 0;
    const taxableAmount = Math.max(0, preDiscountSubtotal - safeGlobal);

    // Per-item VAT following Tunisian fiscal law
    const breakdown: Record<string, { base: number; tax: number }> = {};
    let taxTotal = 0;
    for (const it of items) {
      const rate = taxEnabled ? (it.product.taxRate ?? defaultTaxRate) : 0;
      const lineHT = (it.product.price * it.quantity) - it.discount;
      const base = Math.max(0, lineHT * (1 - ratio));
      const t = base * rate;
      taxTotal += t;
      const key = rate.toFixed(2);
      if (!breakdown[key]) breakdown[key] = { base: 0, tax: 0 };
      breakdown[key].base += base;
      breakdown[key].tax += t;
    }
    const tax = taxTotal;
    const total = taxableAmount + tax;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, itemsDiscount, taxableAmount, tax, total, itemCount, taxBreakdown: breakdown };
  }, [items, globalDiscount, defaultTaxRate, taxEnabled]);

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
    itemCount,
    taxBreakdown,
  };
}
