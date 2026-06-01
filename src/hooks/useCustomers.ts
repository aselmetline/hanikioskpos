import { useState, useCallback, useMemo, useEffect } from 'react';
import { Customer, CustomerPayment } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';

const POINTS_PER_DINAR = 1;
const POINTS_TO_DINAR_RATE = 100;

const mapCustomer = (c: any): Customer => ({
  id: c.id,
  name: c.name,
  phone: c.phone || '',
  email: c.email || undefined,
  address: c.address || undefined,
  birthday: c.birthday || undefined,
  notes: c.notes || undefined,
  creditLimit: Number(c.credit_limit ?? 0),
  points: c.points,
  creditBalance: Number(c.credit_balance),
  createdAt: new Date(c.created_at),
});

export type NewCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthday?: string;
  notes?: string;
  creditLimit?: number;
};

export function useCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      setLoading(true);
      const { data, error } = await fetchAllPaginated<any>(
        (from, to) => supabase.from('customers').select('*').order('created_at', { ascending: false }).range(from, to)
      );

      if (error) {
        console.error('Error fetching customers:', error);
        toast.error('خطأ في تحميل العملاء');
      } else {
        setCustomers(data.map(mapCustomer));
      }
      setLoading(false);
    };

    fetchCustomers();

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
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const addCustomer = useCallback(async (input: NewCustomerInput) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        birthday: input.birthday || null,
        notes: input.notes || null,
        credit_limit: input.creditLimit ?? 0,
        points: 0,
        credit_balance: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      toast.error('خطأ في إضافة العميل');
      return null;
    }

    const newCustomer = mapCustomer(data);
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, [user]);

  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.address !== undefined) dbUpdates.address = updates.address || null;
    if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.creditBalance !== undefined) dbUpdates.credit_balance = updates.creditBalance;

    const { error } = await supabase.from('customers').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating customer:', error);
      toast.error('خطأ في تحديث العميل');
      return false;
    }
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...updates } : c)));
    return true;
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting customer:', error);
      toast.error('خطأ في حذف العميل');
      return false;
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
    return true;
  }, []);

  const recordPayment = useCallback(async (
    customerId: string,
    amount: number,
    paymentMethod: string = 'cash',
    notes?: string,
    addToCashbox: boolean = true,
  ) => {
    const { error } = await supabase.rpc('record_customer_payment', {
      p_customer_id: customerId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_notes: notes ?? null,
      p_add_to_cashbox: addToCashbox,
    });
    if (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'خطأ في تسجيل الدفعة');
      return false;
    }
    return true;
  }, []);

  const getCustomerPayments = useCallback(async (customerId: string): Promise<CustomerPayment[]> => {
    const { data, error } = await supabase
      .from('customer_payments')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      customerId: p.customer_id,
      amount: Number(p.amount),
      paymentMethod: p.payment_method,
      notes: p.notes || undefined,
      createdAt: new Date(p.created_at),
    }));
  }, []);

  const getCustomerSales = useCallback(async (customerId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .select('id, total, payment_method, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error || !data) return [];
    return data;
  }, []);

  const updateCreditBalance = useCallback(async (id: string, amount: number) => {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    const newBalance = customer.creditBalance + amount;
    const { error } = await supabase.from('customers').update({ credit_balance: newBalance }).eq('id', id);
    if (error) return;
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, creditBalance: newBalance } : c)));
  }, [customers]);

  const addPoints = useCallback(async (id: string, purchaseAmount: number) => {
    const pointsToAdd = Math.floor(purchaseAmount * POINTS_PER_DINAR);
    if (pointsToAdd <= 0) return 0;
    const { data: current } = await supabase.from('customers').select('points').eq('id', id).maybeSingle();
    if (!current) return 0;
    const newPoints = current.points + pointsToAdd;
    await supabase.from('customers').update({ points: newPoints }).eq('id', id);
    if (user) {
      await supabase.from('points_transactions').insert({
        customer_id: id, user_id: user.id, type: 'earn', points: pointsToAdd,
        description: `كسب نقاط من عملية شراء بقيمة ${purchaseAmount.toFixed(3)}`,
      });
    }
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, points: newPoints } : c)));
    return pointsToAdd;
  }, [user]);

  const redeemPoints = useCallback(async (id: string, pointsToRedeem: number): Promise<number> => {
    if (pointsToRedeem <= 0) return 0;
    const { data: current } = await supabase.from('customers').select('points').eq('id', id).maybeSingle();
    if (!current || pointsToRedeem > current.points) return 0;
    const newPoints = current.points - pointsToRedeem;
    const discount = pointsToRedeem / POINTS_TO_DINAR_RATE;
    await supabase.from('customers').update({ points: newPoints }).eq('id', id);
    if (user) {
      await supabase.from('points_transactions').insert({
        customer_id: id, user_id: user.id, type: 'redeem', points: pointsToRedeem,
        description: `استبدال ${pointsToRedeem} نقطة بخصم ${discount.toFixed(3)}`,
      });
    }
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, points: newPoints } : c)));
    return discount;
  }, [user]);

  const getPointsHistory = useCallback(async (customerId: string) => {
    const { data, error } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return data;
  }, []);

  const calculatePointsDiscount = useCallback((points: number) => points / POINTS_TO_DINAR_RATE, []);
  const findByPhone = useCallback((phone: string) => customers.find(c => c.phone === phone), [customers]);

  return {
    customers,
    filteredCustomers,
    searchQuery,
    setSearchQuery,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordPayment,
    getCustomerPayments,
    getCustomerSales,
    addPoints,
    updateCreditBalance,
    redeemPoints,
    calculatePointsDiscount,
    findByPhone,
    getPointsHistory,
    loading,
    POINTS_TO_DINAR_RATE,
  };
}
