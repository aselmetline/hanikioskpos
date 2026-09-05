import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, Send, Shield, ShieldCheck, UserCog, UserPlus, Users as UsersIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/contexts/LanguageContext';
import { useUserRoles, type AppRole } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ROLES: { id: AppRole; icon: typeof Shield }[] = [
  { id: 'admin', icon: ShieldCheck },
  { id: 'manager', icon: UserCog },
  { id: 'cashier', icon: Shield },
];

export default function UsersPage() {
  const t = useT();
  const { user } = useAuth();
  const { isAdmin, users, loading, addRole, removeRole, inviteUser, resendInvite, sendPasswordReset } = useUserRoles();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ email: string; displayName: string; phone: string; roles: AppRole[] }>({
    email: '', displayName: '', phone: '', roles: ['cashier'],
  });

  const toggleFormRole = (role: AppRole) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));

  const submitInvite = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      toast.error(t('users.invalidEmail'));
      return;
    }
    setSaving(true);
    const error = await inviteUser({
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      phone: form.phone.trim() || undefined,
      roles: form.roles,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('users.inviteSent'));
    setForm({ email: '', displayName: '', phone: '', roles: ['cashier'] });
    setOpen(false);
  };

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (userId === user?.id && role === 'admin' && has) {
      toast.error(t('users.cannotRemoveSelf'));
      return;
    }
    const error = has ? await removeRole(userId, role) : await addRole(userId, role);
    if (error) toast.error(error.message);
    else toast.success(t('common.saved'));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('users.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 me-1" />
                  {t('users.newUser')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('users.newUser')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t('users.email')}</Label>
                    <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('users.displayName')}</Label>
                    <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('common.phone')}</Label>
                    <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('users.permissions')}</Label>
                    {ROLES.map(({ id }) => (
                      <label key={id} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={form.roles.includes(id)} onCheckedChange={() => toggleFormRole(id)} />
                        {t(`users.role.${id}`)}
                      </label>
                    ))}
                  </div>
                  <Button className="w-full" disabled={saving} onClick={submitInvite}>
                    <Send className="w-4 h-4 me-1" />
                    {t('users.sendInvite')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowRight className="w-4 h-4 ms-1" />
              {t('common.back')}
            </Link>
          </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : !isAdmin ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t('users.noAccess')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.userId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>{u.displayName}</span>
                    {u.userId === user?.id && (
                      <Badge variant="secondary">{t('users.you')}</Badge>
                    )}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {u.email && <span dir="ltr">{u.email}</span>}
                    {u.phone && <span dir="ltr">{u.phone}</span>}
                    <Badge variant={u.confirmed ? 'secondary' : 'outline'}>
                      {u.confirmed ? t('users.active') : t('users.pending')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ROLES.map(({ id, icon: Icon }) => {
                    const has = u.roles.includes(id);
                    return (
                      <div key={id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <span className="flex items-center gap-2 text-sm">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          {t(`users.role.${id}`)}
                        </span>
                        <Switch checked={has} onCheckedChange={() => toggleRole(u.userId, id, has)} />
                      </div>
                    );
                  })}
                  {u.email && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!u.confirmed && (
                        <Button size="sm" variant="outline" onClick={async () => {
                          const err = await resendInvite(u.email!);
                          err ? toast.error(err) : toast.success(t('users.inviteSent'));
                        }}>
                          <Mail className="w-4 h-4 me-1" />
                          {t('users.resend')}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={async () => {
                        const err = await sendPasswordReset(u.email!);
                        err ? toast.error(err) : toast.success(t('users.inviteSent'));
                      }}>
                        <KeyRound className="w-4 h-4 me-1" />
                        {t('users.resetPassword')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {users.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  {t('users.empty')}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
