import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight, ArrowRight, KeyRound, LayoutDashboard, Package, Pencil, Receipt,
  Search, Send, Shield, ShieldCheck, Trash2, UserCog, Users as UsersIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/pos/DeleteConfirmDialog';
import { EditProductDialog } from '@/components/pos/EditProductDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles, type AppRole } from '@/hooks/useUserRoles';
import { useProducts } from '@/hooks/useProducts';
import { useSales } from '@/hooks/useSales';
import { useInternalTransfers } from '@/hooks/useInternalTransfers';
import type { Product, Sale } from '@/types/pos';
import { toast } from 'sonner';

const ROLES: { id: AppRole; icon: typeof Shield }[] = [
  { id: 'admin', icon: ShieldCheck },
  { id: 'manager', icon: UserCog },
  { id: 'cashier', icon: Shield },
];

export default function AdminPage() {
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();
  const { isAdmin, users, loading: usersLoading, addRole, removeRole, resendInvite, sendPasswordReset } = useUserRoles();
  const { products, updateProduct, deleteProduct, loading: productsLoading } = useProducts();
  const { sales, loading: salesLoading } = useSales();
  const { transfers, deleteTransfer, loading: transfersLoading } = useInternalTransfers();

  const [query, setQuery] = useState('');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'product' | 'transfer'; id: string } | null>(null);
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null);

  const fmt = (n: number) => `${n.toFixed(3)} ${t('common.currency') || 'د.ت'}`;
  const dateFmt = (d: Date) => new Date(d).toLocaleString(language === 'fr' ? 'fr-FR' : 'ar-TN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const q = query.trim().toLowerCase();

  const filteredProducts = useMemo(
    () => products.filter(p => !q || p.name.toLowerCase().includes(q) || p.nameAr.toLowerCase().includes(q) || (p.barcode ?? '').includes(q)),
    [products, q]
  );
  const filteredTransfers = useMemo(
    () => transfers.filter(tr => !q || tr.sourceProductName.toLowerCase().includes(q) || tr.targetProductName.toLowerCase().includes(q)),
    [transfers, q]
  );
  const filteredSales = useMemo(
    () => sales.filter(s => !q || String(s.invoiceNumber ?? '').includes(q) || s.items.some(i => i.product.nameAr.toLowerCase().includes(q))),
    [sales, q]
  );
  const filteredUsers = useMemo(
    () => users.filter(u => !q || u.displayName.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)),
    [users, q]
  );

  const salesTotal = useMemo(() => sales.reduce((s, x) => s + x.total, 0), [sales]);

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (userId === user?.id && role === 'admin' && has) {
      toast.error(t('users.cannotRemoveSelf'));
      return;
    }
    const error = has ? await removeRole(userId, role) : await addRole(userId, role);
    if (error) toast.error(error.message);
    else toast.success(t('common.saved'));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'product') await deleteProduct(deleteTarget.id);
    else await deleteTransfer(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (!usersLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto mt-20 text-center space-y-4">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{t('users.noAccess')}</p>
          <Button asChild variant="outline"><Link to="/">{t('admin.back')}</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">{t('admin.title')}</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/"><ArrowRight className={`w-4 h-4 me-1 ${isRTL ? '' : 'rotate-180'}`} />{t('admin.back')}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t('admin.tabs.users'), value: users.length, icon: UsersIcon },
            { label: t('admin.tabs.products'), value: products.length, icon: Package },
            { label: t('admin.tabs.transfers'), value: transfers.length, icon: ArrowLeftRight },
            { label: t('admin.salesTotal'), value: fmt(salesTotal), icon: Receipt },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute top-3 start-3 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('admin.searchPlaceholder')} className="ps-9" />
        </div>

        <Tabs defaultValue="users">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="users">{t('admin.tabs.users')}</TabsTrigger>
            <TabsTrigger value="products">{t('admin.tabs.products')}</TabsTrigger>
            <TabsTrigger value="transfers">{t('admin.tabs.transfers')}</TabsTrigger>
            <TabsTrigger value="sales">{t('admin.tabs.sales')}</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users" className="space-y-3 mt-3">
            <Button asChild size="sm" variant="secondary">
              <Link to="/users"><UserCog className="w-4 h-4 me-1" />{t('users.title')}</Link>
            </Button>
            {usersLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}
            {!usersLoading && filteredUsers.length === 0 && <p className="text-muted-foreground text-sm">{t('users.empty')}</p>}
            {filteredUsers.map(u => (
              <Card key={u.userId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {u.displayName}
                    {u.userId === user?.id && <Badge variant="secondary">{t('users.you')}</Badge>}
                    <Badge variant={u.confirmed ? 'default' : 'outline'}>
                      {u.confirmed ? t('users.active') : t('users.pending')}
                    </Badge>
                  </CardTitle>
                  {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {ROLES.map(({ id, icon: Icon }) => {
                      const has = u.roles.includes(id);
                      return (
                        <div key={id} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {t(`users.role.${id}`)}
                          </span>
                          <Switch checked={has} onCheckedChange={() => toggleRole(u.userId, id, has)} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={async () => {
                      const err = await resendInvite(u.userId);
                      err ? toast.error(err) : toast.success(t('users.inviteSent'));
                    }}>
                      <Send className="w-4 h-4 me-1" />{t('users.resend')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const err = await sendPasswordReset(u.userId);
                      err ? toast.error(err) : toast.success(t('users.inviteSent'));
                    }}>
                      <KeyRound className="w-4 h-4 me-1" />{t('users.resetPassword')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="space-y-2 mt-3">
            {productsLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}
            {filteredProducts.map(p => (
              <Card key={p.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{language === 'fr' ? p.name : p.nameAr}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmt(p.price)} · {t('common.quantity')}: {p.stock}
                      {p.stock <= p.lowStockAlert && <span className="text-destructive ms-1">!</span>}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="outline" onClick={() => setEditProduct(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => setDeleteTarget({ kind: 'product', id: p.id })}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Transfers */}
          <TabsContent value="transfers" className="space-y-2 mt-3">
            {transfersLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}
            {filteredTransfers.map(tr => (
              <Card key={tr.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {tr.sourceProductName} × {tr.sourceQuantity} → {tr.targetProductName} × {tr.targetQuantity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateFmt(tr.createdAt)} · {fmt(tr.sourceTotalValue)}
                    </p>
                  </div>
                  <Button size="icon" variant="destructive" className="shrink-0"
                    onClick={() => setDeleteTarget({ kind: 'transfer', id: tr.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Sales */}
          <TabsContent value="sales" className="space-y-2 mt-3">
            {salesLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}
            {filteredSales.slice(0, 100).map(s => (
              <Card key={s.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">#{s.invoiceNumber ?? '—'} · {fmt(s.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {dateFmt(s.createdAt)} · {s.items.length} · {t(`sell.${s.paymentMethod}`)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSaleDetail(s)}>
                    {t('admin.details')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <EditProductDialog
        open={!!editProduct}
        onOpenChange={(o) => !o && setEditProduct(null)}
        product={editProduct}
        onUpdateProduct={(id, updates) => { updateProduct(id, updates); setEditProduct(null); }}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <Dialog open={!!saleDetail} onOpenChange={(o) => !o && setSaleDetail(null)}>
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>#{saleDetail?.invoiceNumber ?? '—'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {saleDetail?.items.map((it, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="truncate">{it.product.nameAr} × {it.quantity}</span>
                <span>{fmt(it.product.price * it.quantity - it.discount)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>{t('common.total')}</span>
              <span>{saleDetail ? fmt(saleDetail.total) : ''}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
