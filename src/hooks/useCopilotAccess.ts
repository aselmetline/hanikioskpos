import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** True when the current user is admin or manager (server re-checks every request). */
export function useCopilotAccess() {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!user) { setAllowed(false); return; }
    let alive = true;
    Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'manager' }),
    ]).then(([a, m]) => { if (alive) setAllowed(Boolean(a.data) || Boolean(m.data)); });
    return () => { alive = false; };
  }, [user]);
  return allowed;
}
