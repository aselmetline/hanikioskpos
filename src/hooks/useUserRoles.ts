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
  email?: string | null;
  confirmed?: boolean;
  lastSignInAt?: string | null;
}

export interface InviteInput {
  email: string;
  displayName: string;
  phone?: string;
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

    let authInfo: Record<string, { email: string | null; confirmed: boolean; lastSignInAt: string | null }> = {};
    try {
      const { data: fnData } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
      for (const u of (fnData?.users ?? []) as Array<{ id: string; email: string | null; confirmed: boolean; lastSignInAt: string | null }>) {
        authInfo[u.id] = { email: u.email, confirmed: u.confirmed, lastSignInAt: u.lastSignInAt };
      }
    } catch {
      authInfo = {};
    }

    const list: ManagedUser[] = (profiles ?? []).map((p) => ({
      userId: p.user_id,
      displayName: p.display_name,
      phone: p.phone,
      createdAt: p.created_at,
      roles: (roles ?? []).filter((r) => r.user_id === p.user_id).map((r) => r.role as AppRole),
      email: authInfo[p.user_id]?.email ?? null,
      confirmed: authInfo[p.user_id]?.confirmed ?? false,
      lastSignInAt: authInfo[p.user_id]?.lastSignInAt ?? null,
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

  const inviteUser = useCallback(async (input: InviteInput) => {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'invite',
        email: input.email,
        displayName: input.displayName,
        phone: input.phone ?? null,
        roles: input.roles,
        redirectTo: `${window.location.origin}/auth`,
      },
    });
    const message = (error?.message ?? (data as { error?: string } | null)?.error) || null;
    if (!message) await fetchUsers();
    return message;
  }, [fetchUsers]);

  const resendInvite = useCallback(async (email: string) => {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'resend', email, redirectTo: `${window.location.origin}/auth` },
    });
    return (error?.message ?? (data as { error?: string } | null)?.error) || null;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'reset', email, redirectTo: `${window.location.origin}/auth` },
    });
    return (error?.message ?? (data as { error?: string } | null)?.error) || null;
  }, []);

  return { isAdmin, users, loading, addRole, removeRole, inviteUser, resendInvite, sendPasswordReset, refresh: fetchUsers };
}
