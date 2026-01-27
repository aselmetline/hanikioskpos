import { useState, useEffect, useCallback, useMemo } from 'react';
import { CashBoxTransaction, CashBoxSettings } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useCashBox = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CashBoxTransaction[]>([]);
  const [settings, setSettings] = useState<CashBoxSettings>({
    autoAddSales: false,
    autoDeductPurchases: false,
    autoDeductExpenses: false,
  });
  const [loading, setLoading] = useState(true);

  // Fetch transactions and settings from Supabase
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('cash_box_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Error fetching transactions:', txError);
      } else {
        setTransactions(txData.map(t => ({
          id: t.id,
          type: t.type as 'add' | 'deduct',
          amount: Number(t.amount),
          description: t.description || '',
          date: new Date(t.created_at),
          category: t.category as 'manual' | 'sales' | 'purchases' | 'expenses'
        })));
      }

      // Fetch settings from user_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('auto_add_sales, auto_deduct_purchases, auto_deduct_expenses')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching settings:', settingsError);
      } else if (settingsData) {
        setSettings({
          autoAddSales: settingsData.auto_add_sales ?? false,
          autoDeductPurchases: settingsData.auto_deduct_purchases ?? false,
          autoDeductExpenses: settingsData.auto_deduct_expenses ?? false,
        });
      }

      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('cashbox-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_box_transactions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate balance
  const balance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return t.type === 'add' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const addTransaction = useCallback(async (
    type: 'add' | 'deduct',
    amount: number,
    description: string,
    category: 'manual' | 'sales' | 'purchases' | 'expenses' = 'manual'
  ) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('cash_box_transactions')
      .insert({
        user_id: user.id,
        type,
        amount,
        description: description || null,
        category
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding transaction:', error);
      toast.error('خطأ في إضافة المعاملة');
      return;
    }

    const newTransaction: CashBoxTransaction = {
      id: data.id,
      type: data.type as 'add' | 'deduct',
      amount: Number(data.amount),
      description: data.description || '',
      date: new Date(data.created_at),
      category: data.category as 'manual' | 'sales' | 'purchases' | 'expenses'
    };

    setTransactions(prev => [newTransaction, ...prev]);
  }, [user]);

  const updateSettings = useCallback(async (newSettings: Partial<CashBoxSettings>) => {
    if (!user) return;

    const dbUpdates: Record<string, boolean> = {};
    if (newSettings.autoAddSales !== undefined) dbUpdates.auto_add_sales = newSettings.autoAddSales;
    if (newSettings.autoDeductPurchases !== undefined) dbUpdates.auto_deduct_purchases = newSettings.autoDeductPurchases;
    if (newSettings.autoDeductExpenses !== undefined) dbUpdates.auto_deduct_expenses = newSettings.autoDeductExpenses;

    const { error } = await supabase
      .from('user_settings')
      .update(dbUpdates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating settings:', error);
      toast.error('خطأ في تحديث الإعدادات');
      return;
    }

    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [user]);

  const getTodayTransactions = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions.filter(t => new Date(t.date) >= today);
  }, [transactions]);

  const clearTransactions = useCallback(async () => {
    // Note: This would delete all transactions from DB
    // For now, just clear local state
    setTransactions([]);
  }, []);

  return {
    transactions,
    balance,
    settings,
    addTransaction,
    updateSettings,
    getTodayTransactions,
    clearTransactions,
    loading
  };
};
