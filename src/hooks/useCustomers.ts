import { useState, useCallback, useMemo, useEffect } from 'react';
import { Customer } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const POINTS_PER_DINAR = 1;
const POINTS_TO_DINAR_RATE = 100; // 100 points = 1 TND discount

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch customers from Supabase
  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        toast.error('خطأ في تحميل العملاء');
      } else {
        setCustomers(data.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          points: c.points,
          creditBalance: Number(c.credit_balance),
          createdAt: new Date(c.created_at)
        })));
      }
      setLoading(false);
    };

    fetchCustomers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('customers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredCustomers = useMemo(() => {
    if (searchQuery === '') return customers;
    return customers.filter(c =>
      c.name.includes(searchQuery) ||
      c.phone.includes(searchQuery)
    );
  }, [customers, searchQuery]);

  const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'points' | 'creditBalance' | 'createdAt'>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name: customer.name,
        phone: customer.phone || null,
        points: 0,
        credit_balance: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      toast.error('خطأ في إضافة العميل');
      return null;
    }

    const newCustomer: Customer = {
      id: data.id,
      name: data.name,
      phone: data.phone || '',
      points: data.points,
      creditBalance: Number(data.credit_balance),
      createdAt: new Date(data.created_at)
    };

    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, [user]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.creditBalance !== undefined) dbUpdates.credit_balance = updates.creditBalance;

    const { error } = await supabase
      .from('customers')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating customer:', error);
      toast.error('خطأ في تحديث العميل');
      return;
    }

    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  }, []);

  const addPoints = useCallback(async (id: string, purchaseAmount: number) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return 0;

    const pointsToAdd = Math.floor(purchaseAmount * POINTS_PER_DINAR);
    const newPoints = customer.points + pointsToAdd;

    const { error } = await supabase
      .from('customers')
      .update({ points: newPoints })
      .eq('id', id);

    if (error) {
      console.error('Error adding points:', error);
      return 0;
    }

    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, points: newPoints } : c
    ));

    return pointsToAdd;
  }, [customers]);

  const updateCreditBalance = useCallback(async (id: string, amount: number) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    const newBalance = customer.creditBalance + amount;

    const { error } = await supabase
      .from('customers')
      .update({ credit_balance: newBalance })
      .eq('id', id);

    if (error) {
      console.error('Error updating credit balance:', error);
      return;
    }

    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, creditBalance: newBalance } : c
    ));
  }, [customers]);

  const redeemPoints = useCallback(async (id: string, pointsToRedeem: number): Promise<number> => {
    if (pointsToRedeem <= 0) return 0;

    // Fetch current points from database to avoid stale data
    const { data: currentCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('points')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !currentCustomer) {
      console.error('Error fetching customer points:', fetchError);
      return 0;
    }

    if (pointsToRedeem > currentCustomer.points) {
      console.error('Not enough points to redeem');
      return 0;
    }

    const newPoints = currentCustomer.points - pointsToRedeem;
    const discountAmount = pointsToRedeem / POINTS_TO_DINAR_RATE;

    const { error } = await supabase
      .from('customers')
      .update({ points: newPoints })
      .eq('id', id);

    if (error) {
      console.error('Error redeeming points:', error);
      return 0;
    }

    // Update local state
    setCustomers(prev => prev.map(c =>
      c.id === id ? { ...c, points: newPoints } : c
    ));

    return discountAmount;
  }, []);

  const calculatePointsDiscount = useCallback((points: number): number => {
    return points / POINTS_TO_DINAR_RATE;
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
    redeemPoints,
    calculatePointsDiscount,
    findByPhone,
    loading,
    POINTS_TO_DINAR_RATE
  };
}
