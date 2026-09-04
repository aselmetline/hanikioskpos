import { Link } from 'react-router-dom';
import { ArrowRight, Shield, ShieldCheck, UserCog, Users as UsersIcon } from 'lucide-react';
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
  const { isAdmin, users, loading, addRole, removeRole } = useUserRoles();

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
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowRight className="w-4 h-4 ms-1" />
              {t('common.back')}
            </Link>
          </Button>
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
                  {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
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
