import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'manager' | 'cashier';

export interface ManagedUser {
  userId: string;
  displayName: string;
  phone: string | null;
  createdAt: string;
  roles: AppRole[];
}

export function useUserRoles() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      return false;
    }
    const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const admin = Boolean(data);
    setIsAdmin(admin);
    return admin;
  }, [user]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const admin = await checkAdmin();
    if (!admin) {
      setUsers([]);
      setLoading(false);
      return;
    }

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, phone, created_at').order('created_at'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    const list: ManagedUser[] = (profiles ?? []).map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      phone: p.phone,
      createdAt: p.created_at,
      roles: (roles ?? []).filter((r) => r.user_id === p.user_id).map((r) => r.role as AppRole),
    }));
    setUsers(list);
    setLoading(false);
  }, [checkAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = useCallback(async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
    if (!error) await fetchUsers();
    return error;
  }, [fetchUsers]);

  const removeRole = useCallback(async (userId: string, role: AppRole) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
    if (!error) await fetchUsers();
    return error;
  }, [fetchUsers]);

  return { isAdmin, users, loading, addRole, removeRole, refresh: fetchUsers };
}
