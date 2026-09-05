import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ROLES = ['admin', 'manager', 'cashier'] as const;
type Role = (typeof ROLES)[number];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await caller.auth.getUser();
    const callerUser = userData?.user;
    if (!callerUser) return json({ error: 'unauthorized' }, 401);

    const { data: isAdmin } = await caller.rpc('has_role', {
      _user_id: callerUser.id,
      _role: 'admin',
    });
    if (!isAdmin) return json({ error: 'forbidden' }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined;

    if (action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      return json({
        users: data.users.map((u) => ({
          id: u.id,
          email: u.email ?? null,
          confirmed: Boolean(u.email_confirmed_at),
          lastSignInAt: u.last_sign_in_at ?? null,
          createdAt: u.created_at,
        })),
      });
    }

    if (action === 'invite') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const displayName = String(body.displayName ?? '').trim().slice(0, 100);
      const phone = body.phone ? String(body.phone).trim().slice(0, 30) : null;
      const roles: Role[] = Array.isArray(body.roles)
        ? body.roles.filter((r: string): r is Role => (ROLES as readonly string[]).includes(r))
        : [];
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'invalid_email' }, 400);

      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName || email, phone },
        redirectTo,
      });
      if (error) return json({ error: error.message }, 400);

      const newId = data.user?.id;
      if (newId && roles.length) {
        await admin.from('user_roles').insert(roles.map((role) => ({ user_id: newId, role })));
      }
      return json({ userId: newId });
    }

    if (action === 'resend') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email) return json({ error: 'invalid_email' }, 400);
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'reset') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email) return json({ error: 'invalid_email' }, 400);
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unexpected_error' }, 500);
  }
});
