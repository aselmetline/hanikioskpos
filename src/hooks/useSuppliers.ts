import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  debtBalance: number;
  createdAt: Date;
}

export const useSuppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) { setSuppliers([]); setLoading(false); return; }

    const fetchSuppliers = async () => {
      setLoading(true);
      const { data, error } = await fetchAllPaginated<Record<string, unknown>>(
        (from, to) => supabase.from('suppliers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).range(from, to)
      );
      if (error) {
        console.error('Error fetching suppliers:', error);
      } else {
        setSuppliers(data.map(s => ({
          id: String(s.id),
          name: String(s.name || ''),
          phone: String(s.phone || ''),
          address: String(s.address || ''),
          notes: String(s.notes || ''),
          debtBalance: Number(s.debt_balance || 0),
          createdAt: new Date(String(s.created_at)),
        })));
      }
      setLoading(false);
    };

    fetchSuppliers();

    const channel = supabase
      .channel('suppliers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => { fetchSuppliers(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addSupplier = useCallback(async (data: { name: string; phone?: string; address?: string; notes?: string }) => {
    if (!user) return null;
    const { data: result, error } = await supabase.from('suppliers').insert({
      user_id: user.id,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      notes: data.notes || null,
    }).select().single();
    if (error) { toast.error('خطأ في إضافة المورد'); return null; }
    const supplier: Supplier = {
      id: result.id, name: result.name, phone: result.phone || '',
      address: result.address || '', notes: result.notes || '',
      debtBalance: Number(result.debt_balance), createdAt: new Date(result.created_at),
    };
    setSuppliers(prev => [supplier, ...prev]);
    return supplier;
  }, [user]);

  const updateSupplier = useCallback(async (id: string, updates: Partial<{ name: string; phone: string; address: string; notes: string }>) => {
    if (!user) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
    if (updates.address !== undefined) dbUpdates.address = updates.address || null;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
    const { error } = await supabase.from('suppliers').update(dbUpdates).eq('id', id);
    if (error) { toast.error('خطأ في تحديث المورد'); return; }
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [user]);

  const updateDebt = useCallback(async (id: string, amount: number) => {
    if (!user) return;
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    const newBalance = supplier.debtBalance + amount;
    const { error } = await supabase.from('suppliers').update({ debt_balance: newBalance }).eq('id', id);
    if (error) { toast.error('خطأ في تحديث الرصيد'); return; }
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, debtBalance: newBalance } : s));
  }, [user, suppliers]);

  const deleteSupplier = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) { toast.error('خطأ في حذف المورد'); return; }
    setSuppliers(prev => prev.filter(s => s.id !== id));
    toast.success('تم حذف المورد');
  }, [user]);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.includes(searchQuery) || s.phone.includes(searchQuery)
  );

  return { suppliers, filteredSuppliers, loading, searchQuery, setSearchQuery, addSupplier, updateSupplier, updateDebt, deleteSupplier };
};
