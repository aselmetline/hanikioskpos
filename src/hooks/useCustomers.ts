import { useState, useCallback, useMemo, useEffect } from 'react';
import { Customer, CustomerPayment } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';
import { tx } from '@/i18n/t';
import { loadCache, saveCache } from '@/lib/offlineCache';
import { subscribeRevalidate } from '@/lib/cacheRevalidate';
import {
  buildBaseCustomerId,
  generateUniqueCustomerId,
  type CustomerIdInput,
} from '@/utils/customerId';


const POINTS_PER_DINAR = 1;
const POINTS_TO_DINAR_RATE = 100;

const mapCustomer = (c: any): Customer => ({
  id: c.id,
  externalId: c.external_id || undefined,
  name: c.name,
  phone: c.phone || '',
  email: c.email || undefined,
  address: c.address || undefined,
  birthday: c.birthday || undefined,
  notes: c.notes || undefined,
  creditLimit: Number(c.credit_limit ?? 0),
  points: c.points,
  creditBalance: Number(c.credit_balance),
  openingDebtBalance: Number(c.opening_debt_balance ?? 0),
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
  openingDebtBalance?: number;
  /** Optional override; when omitted we derive a deterministic ID from the name. */
  externalId?: string;
  /** Source used to derive the externalId when not provided. Defaults to "name". */
  externalIdSource?: CustomerIdInput;
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

    let cancelled = false;

    const fetchCustomers = async () => {
      const { data, error } = await fetchAllPaginated<any>(
        (from, to) => supabase.from('customers').select('*').order('created_at', { ascending: false }).range(from, to)
      );
      if (cancelled) return;

      if (error) {
        console.error('Error fetching customers:', error);
        const cached = await loadCache<any[]>('customers', user.id);
        if (cancelled) return;
        if (cached?.data?.length) {
          setCustomers(cached.data.map(mapCustomer));
        } else {
          toast.error(tx('errors.loadCustomers'));
        }
      } else {
        setCustomers(data.map(mapCustomer));
        saveCache('customers', user.id, data);
      }
      setLoading(false);
    };

    const hydrate = async () => {
      const cached = await loadCache<any[]>('customers', user.id);
      if (!cancelled && cached?.data?.length) {
        setCustomers(prev => (prev.length ? prev : cached.data.map(mapCustomer)));
        setLoading(false);
      }
      await fetchCustomers();
    };

    setLoading(true);
    hydrate();

    const channel = supabase
      .channel('customers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchCustomers();
      })
      .subscribe();

    return () => {
      cancelled = true;
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

  /** DB-level uniqueness check using the (user_id, external_id) unique index. */
  const isExternalIdTaken = useCallback(async (externalId: string): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .eq('external_id', externalId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }, [user]);

  /** Look up a loaded customer by their deterministic external_id. */
  const findByExternalId = useCallback(
    (externalId: string) => customers.find(c => c.externalId === externalId),
    [customers],
  );

  /** Build (and verify uniqueness of) an external_id from qr | code | name input. */
  const resolveExternalId = useCallback(
    (source: CustomerIdInput) => generateUniqueCustomerId(source, isExternalIdTaken),
    [isExternalIdTaken],
  );


  const addCustomer = useCallback(async (input: NewCustomerInput) => {
    if (!user) return null;

    // Derive a deterministic external_id when the caller did not pass one.
    let externalId = input.externalId?.trim();
    if (!externalId) {
      const source: CustomerIdInput = input.externalIdSource ?? { type: 'name', value: input.name };
      try {
        externalId = await generateUniqueCustomerId(source, isExternalIdTaken);
      } catch (e) {
        console.error('Error generating external_id:', e);
      }
    } else if (await isExternalIdTaken(externalId)) {
      toast.error(tx('errors.duplicateCustomerId'));
      return null;
    }

    const openingDebt = input.openingDebtBalance ?? 0;
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
        external_id: externalId ?? null,
        points: 0,
        opening_debt_balance: openingDebt,
        credit_balance: openingDebt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding customer:', error);
      if ((error as any).code === '23505') {
        toast.error(tx('errors.duplicateCustomerId'));
      } else {
        toast.error(tx('errors.addCustomer'));
      }
      return null;
    }

    const newCustomer = mapCustomer(data);
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, [user, isExternalIdTaken]);

  /**
   * Look up a customer by the deterministic external_id derived from a
   * QR / code / name input — querying the DB directly so we never miss
   * a customer that isn't in the local cache yet. Returns null if none.
   */
  const findByExternalIdSource = useCallback(async (
    source: CustomerIdInput,
  ): Promise<Customer | null> => {
    if (!user) return null;
    const externalId = buildBaseCustomerId(source);
    const cached = customers.find(c => c.externalId === externalId);
    if (cached) return cached;
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .eq('external_id', externalId)
      .maybeSingle();
    if (error || !data) return null;
    return mapCustomer(data);
  }, [user, customers]);

  /**
   * Resolve a QR/code/name to an existing customer (preserving their points
   * and credit balance), or create a fresh one if no match exists. This is
   * the core guarantee that scanning the same QR/code twice always returns
   * the SAME customer record — so HaniWafa points never get lost.
   */
  const findOrCreateByExternalIdSource = useCallback(async (
    source: CustomerIdInput,
    fallback?: Omit<NewCustomerInput, 'externalId' | 'externalIdSource' | 'name'> & { name?: string },
  ): Promise<Customer | null> => {
    const existing = await findByExternalIdSource(source);
    if (existing) return existing;
    const defaultName = source.type === 'name'
      ? source.value.trim()
      : `${source.type.toUpperCase()} ${source.value.trim()}`;
    return addCustomer({
      name: fallback?.name?.trim() || defaultName,
      phone: fallback?.phone,
      email: fallback?.email,
      address: fallback?.address,
      birthday: fallback?.birthday,
      notes: fallback?.notes,
      creditLimit: fallback?.creditLimit,
      externalIdSource: source,
    });
  }, [findByExternalIdSource, addCustomer]);


  const updateCustomer = useCallback(async (id: string, updates: Partial<Customer>) => {
    const existing = customers.find(c => c.id === id);
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.email !== undefined) dbUpdates.email = updates.email || null;
    if (updates.address !== undefined) dbUpdates.address = updates.address || null;
    if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    if (updates.creditLimit !== undefined) dbUpdates.credit_limit = updates.creditLimit;
    if (updates.externalId !== undefined) dbUpdates.external_id = updates.externalId || null;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.creditBalance !== undefined) dbUpdates.credit_balance = updates.creditBalance;

    if (updates.openingDebtBalance !== undefined && existing) {
      const diff = updates.openingDebtBalance - existing.openingDebtBalance;
      dbUpdates.opening_debt_balance = updates.openingDebtBalance;
      if (diff !== 0) {
        dbUpdates.credit_balance = existing.creditBalance + diff;
      }
    }

    const { error } = await supabase.from('customers').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('Error updating customer:', error);
      if ((error as any).code === '23505') {
        toast.error(tx('errors.duplicateCustomerId'));
      } else {
        toast.error(tx('errors.updateCustomer'));
      }
      return false;
    }
    setCustomers(prev => prev.map(c => {
      if (c.id !== id) return c;
      const patched = { ...c, ...updates };
      if (updates.openingDebtBalance !== undefined && existing && updates.openingDebtBalance !== existing.openingDebtBalance) {
        patched.creditBalance = existing.creditBalance + (updates.openingDebtBalance - existing.openingDebtBalance);
      }
      return patched;
    }));
    return true;
  }, [customers]);

  const deleteCustomer = useCallback(async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.error('Error deleting customer:', error);
      toast.error(tx('errors.deleteCustomer'));
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
      toast.error(error.message || tx('errors.recordPayment'));
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
    findByExternalId,
    findByExternalIdSource,
    findOrCreateByExternalIdSource,
    resolveExternalId,
    isExternalIdTaken,
    buildCustomerIdPreview: buildBaseCustomerId,
    getPointsHistory,
    loading,
    POINTS_TO_DINAR_RATE,
  };
}
