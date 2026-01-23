import { useState, useEffect } from 'react';
import { CashBoxTransaction, CashBoxSettings } from '@/types/pos';

const CASH_BOX_KEY = 'hani_cashbox';
const CASH_BOX_SETTINGS_KEY = 'hani_cashbox_settings';

export const useCashBox = () => {
  const [transactions, setTransactions] = useState<CashBoxTransaction[]>([]);
  const [settings, setSettings] = useState<CashBoxSettings>({
    autoAddSales: false,
    autoDeductPurchases: false,
    autoDeductExpenses: false,
  });
  const [balance, setBalance] = useState(0);

  // Load from localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem(CASH_BOX_KEY);
    const savedSettings = localStorage.getItem(CASH_BOX_SETTINGS_KEY);
    
    if (savedTransactions) {
      const parsed = JSON.parse(savedTransactions);
      setTransactions(parsed.map((t: any) => ({ ...t, date: new Date(t.date) })));
    }
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Calculate balance
  useEffect(() => {
    const total = transactions.reduce((acc, t) => {
      return t.type === 'add' ? acc + t.amount : acc - t.amount;
    }, 0);
    setBalance(total);
  }, [transactions]);

  // Save transactions to localStorage
  useEffect(() => {
    localStorage.setItem(CASH_BOX_KEY, JSON.stringify(transactions));
  }, [transactions]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(CASH_BOX_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const addTransaction = (
    type: 'add' | 'deduct',
    amount: number,
    description: string,
    category: 'manual' | 'sales' | 'purchases' | 'expenses' = 'manual'
  ) => {
    const newTransaction: CashBoxTransaction = {
      id: Date.now().toString(),
      type,
      amount,
      description,
      date: new Date(),
      category,
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const updateSettings = (newSettings: Partial<CashBoxSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const getTodayTransactions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions.filter(t => new Date(t.date) >= today);
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  return {
    transactions,
    balance,
    settings,
    addTransaction,
    updateSettings,
    getTodayTransactions,
    clearTransactions,
  };
};
