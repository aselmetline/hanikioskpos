import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Purchase } from '@/types/pos';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Crown, Package, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props { purchases: Purchase[]; }

export const PurchasesReportView: React.FC<Props> = ({ purchases }) => {
  const { t } = useLanguage();

  const topSuppliers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    purchases.forEach(p => {
      if (!p.supplierName) return;
      const k = p.supplierId || p.supplierName;
      const cur = map.get(k) || { name: p.supplierName, total: 0, count: 0 };
      cur.total += p.total; cur.count += 1;
      map.set(k, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [purchases]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    purchases.forEach(p => p.items.forEach(it => {
      const k = it.product.id || it.product.name;
      const cur = map.get(k) || { name: it.product.name || it.product.nameAr || '-', qty: 0, total: 0 };
      cur.qty += it.quantity; cur.total += it.total;
      map.set(k, cur);
    }));
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [purchases]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, number>();
    purchases.forEach(p => {
      const k = format(new Date(p.invoiceDate), 'yyyy-MM');
      map.set(k, (map.get(k) || 0) + p.total);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({ month: month.slice(5), total: Number(total.toFixed(3)) }));
  }, [purchases]);

  if (purchases.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">{t('purchases.noInvoices')}</div>;
  }

  return (
    <div className="space-y-3">
      {topSuppliers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> أفضل الموردين</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topSuppliers} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-green-600" /> أكثر المنتجات شراءً</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-left shrink-0">
                  <div className="font-bold">{p.qty}</div>
                  <div className="text-[10px] text-muted-foreground">{p.total.toFixed(3)} TND</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> اتجاه التكاليف (آخر 6 أشهر)</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
