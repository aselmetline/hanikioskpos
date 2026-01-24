import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseCategory } from '@/types/pos';

const EXPENSES_KEY = 'hani_expenses';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(EXPENSES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setExpenses(parsed.map((e: any) => ({
        ...e,
        date: new Date(e.date),
        createdAt: new Date(e.createdAt),
      })));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const addExpense = useCallback((
    amount: number,
    category: ExpenseCategory,
    description: string,
    date: Date = new Date()
  ): Expense => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      amount,
      category,
      description,
      date,
      createdAt: new Date(),
    };
    setExpenses(prev => [newExpense, ...prev]);
    return newExpense;
  }, []);

  const deleteExpense = useCallback((id: string) => {
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
  };
};
