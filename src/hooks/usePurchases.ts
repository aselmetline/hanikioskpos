import { useState, useEffect } from 'react';
import { Purchase, PurchaseItem, Product } from '@/types/pos';

const PURCHASES_KEY = 'hani_purchases';

export const usePurchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currentItems, setCurrentItems] = useState<PurchaseItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('1');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(PURCHASES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setPurchases(parsed.map((p: any) => ({
        ...p,
        invoiceDate: new Date(p.invoiceDate),
        createdAt: new Date(p.createdAt)
      })));
      // Set next invoice number
      if (parsed.length > 0) {
        const maxNumber = Math.max(...parsed.map((p: any) => parseInt(p.invoiceNumber) || 0));
        setInvoiceNumber((maxNumber + 1).toString());
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  }, [purchases]);

  const addItemToPurchase = (product: Product, cost: number, quantity: number) => {
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
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCurrentItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity, total: item.cost * quantity }
        : item
    ));
  };

  const updateItemCost = (productId: string, cost: number) => {
    setCurrentItems(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, cost, total: cost * item.quantity }
        : item
    ));
  };

  const removeItem = (productId: string) => {
    setCurrentItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCurrentItems = () => {
    setCurrentItems([]);
  };

  const savePurchase = (invoiceDate: Date): Purchase => {
    const total = currentItems.reduce((sum, item) => sum + item.total, 0);
    
    const newPurchase: Purchase = {
      id: Date.now().toString(),
      invoiceNumber,
      invoiceDate,
      items: [...currentItems],
      total,
      createdAt: new Date()
    };

    setPurchases(prev => [newPurchase, ...prev]);
    setInvoiceNumber((parseInt(invoiceNumber) + 1).toString());
    clearCurrentItems();

    return newPurchase;
  };

  const currentTotal = currentItems.reduce((sum, item) => sum + item.total, 0);

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
    savePurchase
  };
};
