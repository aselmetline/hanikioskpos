import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseCategory } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';
import { tx } from '@/i18n/t';

export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch expenses from Supabase
  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const fetchExpenses = async () => {
      setLoading(true);
      const { data, error } = await fetchAllPaginated<any>(
        (from, to) => supabase.from('expenses').select('*').order('expense_date', { ascending: false }).range(from, to)
      );

      if (error) {
        console.error('Error fetching expenses:', error);
        toast.error(tx('errors.loadExpenses'));
      } else {
        setExpenses(data.map(e => ({
          id: e.id,
          amount: Number(e.amount),
          category: e.category as ExpenseCategory,
          description: e.description || '',
          date: new Date(e.expense_date),
          createdAt: new Date(e.created_at)
        })));
      }
      setLoading(false);
    };

    fetchExpenses();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('expenses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addExpense = useCallback(async (
    amount: number,
    category: ExpenseCategory,
    description: string,
    date: Date = new Date()
  ): Promise<Expense | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        amount,
        category,
        description: description || null,
        expense_date: date.toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding expense:', error);
      toast.error(tx('errors.addExpense'));
      return null;
    }

    const newExpense: Expense = {
      id: data.id,
      amount: Number(data.amount),
      category: data.category as ExpenseCategory,
      description: data.description || '',
      date: new Date(data.expense_date),
      createdAt: new Date(data.created_at)
    };

    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  }, [user]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expense:', error);
      toast.error(tx('errors.deleteExpense'));
      return;
    }

    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const getTodayExpenses = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expenses.filter(e => new Date(e.date) >= today);
  }, [expenses]);

  const getMonthExpenses = useCallback(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return expenses.filter(e => new Date(e.date) >= startOfMonth);
  }, [expenses]);

  const getTotalByCategory = useCallback((category: ExpenseCategory) => {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const getTotal = useCallback(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return {
    expenses,
    addExpense,
    deleteExpense,
    getTodayExpenses,
    getMonthExpenses,
    getTotalByCategory,
    getTotal,
    loading
  };
};
