import { useState, useCallback, useMemo } from 'react';
import { Customer } from '@/types/pos';
import { sampleCustomers, POINTS_PER_DINAR } from '@/data/sampleData';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(sampleCustomers);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = useMemo(() => {
    if (searchQuery === '') return customers;
    return customers.filter(c =>
      c.name.includes(searchQuery) ||
      c.phone.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'points' | 'creditBalance' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: Date.now().toString(),
      points: 0,
      creditBalance: 0,
      createdAt: new Date()
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, []);

  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);

  const addPoints = useCallback((id: string, purchaseAmount: number) => {
    const pointsToAdd = Math.floor(purchaseAmount * POINTS_PER_DINAR);
    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, points: c.points + pointsToAdd } : c
    ));
    return pointsToAdd;
  }, []);

  const updateCreditBalance = useCallback((id: string, amount: number) => {
    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, creditBalance: c.creditBalance + amount } : c
    ));
  }, []);

  const findByPhone = useCallback((phone: string) => {
    return customers.find(c => c.phone === phone);
  }, [customers]);

  return {
    customers,
    filteredCustomers,
    searchQuery,
    setSearchQuery,
    addCustomer,
    updateCustomer,
    addPoints,
    updateCreditBalance,
    findByPhone
  };
}
