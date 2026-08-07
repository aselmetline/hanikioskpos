import { useMemo, useState } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Banknote, CreditCard, Share2, ShoppingBag, Receipt,
  ArrowUpRight, ArrowDownRight, FileSpreadsheet, Calendar as CalendarIcon, Clock, Package, Percent,
  FileText, Loader2
} from 'lucide-react';

import { Sale, Purchase, Expense, EXPENSE_CATEGORIES } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  format, startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval,
  subDays, eachDayOfInterval, differenceInCalendarDays
} from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, ComposedChart, Line, Area, AreaChart
} from 'recharts';
import { exportSalesReport, exportExpensesReport } from '@/utils/excelUtils';
import { exportFullReport } from '@/utils/excel/fullReportExcel';
import { exportFullReportPdf, shareFullReportPdf } from '@/utils/pdf/fullReportPdf';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import { VatReport } from './reports/VatReport';

interface ReportsTabProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
}

type PeriodKey = 'today' | 'yesterday' | 'last7' | 'month' | 'custom';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium', up ? 'text-success' : 'text-destructive')}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function ReportsTab({ sales, purchases, expenses }: ReportsTabProps) {
  const { t, language, dir } = useLanguage();
  const dateLocale = language === 'ar' ? ar : fr;
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [customFrom, setCustomFrom] = useState<Date>(subDays(new Date(), 6));
  const [customTo, setCustomTo] = useState<Date>(new Date());
  const [pdfBusy, setPdfBusy] = useState(false);


  const today = new Date();

  const { start, end, periodLabel } = useMemo(() => {
    switch (period) {
      case 'yesterday': {
        const d = subDays(today, 1);
        return { start: startOfDay(d), end: endOfDay(d), periodLabel: t('reportsX.yesterday') };
      }
      case 'last7':
        return { start: startOfDay(subDays(today, 6)), end: endOfDay(today), periodLabel: t('reportsX.last7') };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today), periodLabel: t('reportsX.month') };
      case 'custom':
        return { start: startOfDay(customFrom), end: endOfDay(customTo), periodLabel: `${format(customFrom, 'dd/MM')} - ${format(customTo, 'dd/MM')}` };
      default:
        return { start: startOfDay(today), end: endOfDay(today), periodLabel: t('reportsX.today') };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo, language]);

  const spanDays = differenceInCalendarDays(end, start) + 1;
  const prevEnd = endOfDay(subDays(start, 1));
  const prevStart = startOfDay(subDays(start, spanDays));

  const inRange = (d: Date | string, s: Date, e: Date) => isWithinInterval(new Date(d), { start: s, end: e });

  const pick = (s: Date, e: Date) => ({
    sales: sales.filter(x => inRange(x.createdAt, s, e)),
    purchases: purchases.filter(x => inRange(x.invoiceDate, s, e)),
    expenses: expenses.filter(x => inRange(x.date, s, e)),
  });

  const cur = useMemo(() => pick(start, end), [start, end, sales, purchases, expenses]);
  const prev = useMemo(() => pick(prevStart, prevEnd), [prevStart, prevEnd, sales, purchases, expenses]);

  const agg = (d: ReturnType<typeof pick>) => {
    const totalSales = d.sales.reduce((s, x) => s + x.total, 0);
    const totalPurchases = d.purchases.reduce((s, x) => s + x.total, 0);
    const totalExpenses = d.expenses.reduce((s, x) => s + x.amount, 0);
    return {
      totalSales,
      cashSales: d.sales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0),
      creditSales: d.sales.filter(s => s.paymentMethod === 'credit').reduce((s, x) => s + x.total, 0),
      totalPurchases,
      totalExpenses,
      totalCosts: totalPurchases + totalExpenses,
      netProfit: totalSales - totalPurchases - totalExpenses,
      count: d.sales.length,
      avgTicket: d.sales.length ? totalSales / d.sales.length : 0,
    };
  };

  const c = agg(cur);
  const p = agg(prev);
  const profitMargin = c.totalSales > 0 ? (c.netProfit / c.totalSales) * 100 : 0;
  const delta = (a: number, b: number) => (b === 0 ? (a === 0 ? null : 100) : ((a - b) / Math.abs(b)) * 100);

  // Daily series across the selected period (capped to 31 buckets)
  const dailySeries = useMemo(() => {
    const days = eachDayOfInterval({ start, end }).slice(-31);
    return days.map(day => {
      const dayStart = startOfDay(day), dayEnd = endOfDay(day);
      const s = sales.filter(x => inRange(x.createdAt, dayStart, dayEnd)).reduce((a, x) => a + x.total, 0);
      const pu = purchases.filter(x => inRange(x.invoiceDate, dayStart, dayEnd)).reduce((a, x) => a + x.total, 0);
      const ex = expenses.filter(x => inRange(x.date, dayStart, dayEnd)).reduce((a, x) => a + x.amount, 0);
      return {
        day: format(day, spanDays > 8 ? 'dd/MM' : 'EEE', { locale: dateLocale }),
        sales: Number(s.toFixed(3)),
        costs: Number((pu + ex).toFixed(3)),
        profit: Number((s - pu - ex).toFixed(3)),
      };
    });
  }, [start, end, sales, purchases, expenses, spanDays, dateLocale]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    cur.sales.forEach(s => s.items.forEach(it => {
      const key = it.product.id || it.product.name;
      const entry = map.get(key) || { name: (language === 'ar' ? it.product.nameAr : it.product.name) || it.product.name, qty: 0, total: 0 };
      entry.qty += it.quantity;
      entry.total += it.product.price * it.quantity - it.discount;
      map.set(key, entry);
    }));
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [cur.sales, language]);

  const peakHours = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}h`, total: 0 }));
    cur.sales.forEach(s => { buckets[new Date(s.createdAt).getHours()].total += s.total; });
    const active = buckets.filter(b => b.total > 0);
    if (active.length === 0) return [];
    const first = buckets.findIndex(b => b.total > 0);
    const last = 23 - [...buckets].reverse().findIndex(b => b.total > 0);
    return buckets.slice(first, last + 1).map(b => ({ ...b, total: Number(b.total.toFixed(3)) }));
  }, [cur.sales]);

  const vatData = useMemo(() => {
    const map = new Map<string, number>();
    cur.sales.forEach(s => {
      Object.entries(s.taxBreakdown || {}).forEach(([rate, v]) => {
        map.set(rate, (map.get(rate) || 0) + (v?.tax || 0));
      });
    });
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .map(([rate, value], i) => ({ name: `${(Number(rate) * 100).toFixed(0)}%`, value: Number(value.toFixed(3)), color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [cur.sales]);

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: cur.expenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  })).filter(cat => cat.total > 0);

  const expensePieData = expensesByCategory.map((cat, i) => ({
    name: language === 'ar' ? cat.label : cat.labelFr,
    value: Number(cat.total.toFixed(3)),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const paymentMethodData = [
    { name: t('reportsX.cash'), value: Number(c.cashSales.toFixed(3)), color: 'hsl(var(--success))' },
    { name: t('reportsX.credit'), value: Number(c.creditSales.toFixed(3)), color: 'hsl(var(--warning))' },
  ].filter(d => d.value > 0);

  const handleExportFull = () => {
    if (cur.sales.length === 0 && cur.purchases.length === 0 && cur.expenses.length === 0) {
      toast.error(t('reportsX.noDataExport'));
      return;
    }
    exportFullReport({ periodLabel, sales: cur.sales, purchases: cur.purchases, expenses: cur.expenses });
    toast.success(t('reportsX.fullExported'));
  };

  const handleExportSalesExcel = () => {
    if (cur.sales.length === 0) { toast.error(t('reportsX.noSalesExport')); return; }
    exportSalesReport(cur.sales);
    toast.success(t('reportsX.salesExported'));
  };

  const handleExportExpensesExcel = () => {
    if (cur.expenses.length === 0) { toast.error(t('reportsX.noExpensesExport')); return; }
    exportExpensesReport(cur.expenses.map(e => ({ ...e, date: new Date(e.date) })));
    toast.success(t('reportsX.expensesExported'));
  };

  const summaryMessage = () =>
    `📊 ${t('reportsX.pnlTitle')} - ${periodLabel}\n\n📅 ${format(today, 'dd/MM/yyyy')}\n\n💰 ${t('reportsX.sales')}: ${c.totalSales.toFixed(3)} ${CURRENCY}\n🧾 ${t('reportsX.invoicesCount')}: ${c.count}\n🎫 ${t('reportsX.avgTicket')}: ${c.avgTicket.toFixed(3)} ${CURRENCY}\n🛒 ${t('reportsX.purchases')}: ${c.totalPurchases.toFixed(3)} ${CURRENCY}\n📋 ${t('reportsX.expenses')}: ${c.totalExpenses.toFixed(3)} ${CURRENCY}\n\n${c.netProfit >= 0 ? '✅' : '❌'} ${t('reportsX.netProfit')}: ${c.netProfit.toFixed(3)} ${CURRENCY}\n📈 ${t('reportsX.profitMargin')}: ${profitMargin.toFixed(1)}%`;

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(summaryMessage())}`, '_blank');
  };

  const hasData = cur.sales.length > 0 || cur.purchases.length > 0 || cur.expenses.length > 0;

  const pdfInput = () => ({
    periodLabel,
    rangeLabel: `${format(start, 'dd/MM/yyyy')} — ${format(end, 'dd/MM/yyyy')}`,
    language: (language === 'ar' ? 'ar' : 'fr') as 'ar' | 'fr',
    sales: cur.sales,
    purchases: cur.purchases,
    expenses: cur.expenses,
  });

  const handleExportPdf = async () => {
    if (!hasData) { toast.error(t('reportsX.noDataExport')); return; }
    setPdfBusy(true);
    const id = toast.loading(t('reportsX.pdfGenerating'));
    try {
      await exportFullReportPdf(pdfInput());
      toast.success(t('reportsX.pdfExported'), { id });
    } catch {
      toast.error(t('reportsX.pdfFailed'), { id });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleSharePdf = async () => {
    if (!hasData) { toast.error(t('reportsX.noDataExport')); return; }
    setPdfBusy(true);
    const id = toast.loading(t('reportsX.pdfGenerating'));
    try {
      const result = await shareFullReportPdf(pdfInput(), summaryMessage());
      if (result === 'shared') toast.success(t('reportsX.pdfShared'), { id });
      else if (result === 'downloaded') toast.success(t('reportsX.pdfDownloadedShare'), { id });
      else toast.dismiss(id);
    } catch {
      toast.error(t('reportsX.pdfFailed'), { id });
    } finally {
      setPdfBusy(false);
    }
  };


  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'today', label: t('reportsX.today') },
    { key: 'yesterday', label: t('reportsX.yesterday') },
    { key: 'last7', label: t('reportsX.last7') },
    { key: 'month', label: t('reportsX.month') },
    { key: 'custom', label: t('reportsX.custom') },
  ];

  const money = (v: number) => `${v.toFixed(3)} ${CURRENCY}`;

  return (
    <div className="flex flex-col h-full p-4 pb-24" dir={dir}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-bold">{t('reportsX.pnlTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {format(start, 'dd/MM/yyyy')} — {format(end, 'dd/MM/yyyy')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={handleExportFull} className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center" title={t('reportsX.exportFull')}>
            <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
          </button>
          <button onClick={handleExportPdf} disabled={pdfBusy} className="w-10 h-10 bg-destructive rounded-xl flex items-center justify-center disabled:opacity-60" title={t('reportsX.exportPdf')}>
            {pdfBusy ? <Loader2 className="w-5 h-5 text-destructive-foreground animate-spin" /> : <FileText className="w-5 h-5 text-destructive-foreground" />}
          </button>
          <button onClick={handleExportSalesExcel} className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center" title={t('reportsX.exportSales')}>
            <Receipt className="w-5 h-5 text-secondary-foreground" />
          </button>
          <button onClick={handleExportExpensesExcel} className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center" title={t('reportsX.exportExpenses')}>
            <ShoppingBag className="w-5 h-5 text-secondary-foreground" />
          </button>
          <button onClick={handleSharePdf} disabled={pdfBusy} className="h-10 px-3 bg-success rounded-xl flex items-center gap-1.5 text-xs font-semibold text-success-foreground disabled:opacity-60" title={t('reportsX.sharePdfWhatsApp')}>
            <Share2 className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleShareWhatsApp} className="w-10 h-10 bg-success/80 rounded-xl flex items-center justify-center" title={t('common.share')}>
            <Share2 className="w-5 h-5 text-success-foreground" />
          </button>
        </div>

      </div>

      {/* Flexible period selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 -mx-1 px-1">
        {periods.map(pd => (
          <Button
            key={pd.key}
            size="sm"
            variant={period === pd.key ? 'default' : 'outline'}
            className="shrink-0 rounded-full"
            onClick={() => setPeriod(pd.key)}
          >
            {pd.label}
          </Button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2 mb-3">
          {([['from', customFrom, setCustomFrom], ['to', customTo, setCustomTo]] as const).map(([key, value, setter]) => (
            <Popover key={key}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-start font-normal">
                  <CalendarIcon className="w-4 h-4 me-2" />
                  {format(value, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={value} onSelect={(d) => d && setter(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Net profit hero */}
          <Card className={`border-2 ${c.netProfit >= 0 ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('reportsX.netProfit')}</p>
                  <p className={`text-3xl font-bold ${c.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {c.netProfit >= 0 ? '+' : ''}{c.netProfit.toFixed(3)}
                  </p>
                  <p className="text-sm text-muted-foreground">{CURRENCY}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Delta value={delta(c.netProfit, p.netProfit)} />
                    <span>{t('reportsX.vsPrevious')}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${c.netProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                    {c.netProfit >= 0 ? <ArrowUpRight className="w-8 h-8 text-success" /> : <ArrowDownRight className="w-8 h-8 text-destructive" />}
                  </div>
                  <Badge variant={c.netProfit >= 0 ? 'default' : 'destructive'} className="text-xs">
                    {profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI grid with comparisons */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: TrendingUp, label: t('reportsX.totalSales'), value: money(c.totalSales), d: delta(c.totalSales, p.totalSales), tone: 'text-success' },
              { icon: Receipt, label: t('reportsX.invoicesCount'), value: String(c.count), d: delta(c.count, p.count), tone: 'text-primary' },
              { icon: Percent, label: t('reportsX.avgTicket'), value: money(c.avgTicket), d: delta(c.avgTicket, p.avgTicket), tone: 'text-primary' },
              { icon: TrendingDown, label: t('reportsX.totalCosts'), value: money(c.totalCosts), d: delta(c.totalCosts, p.totalCosts), tone: 'text-destructive' },
            ].map((k, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    <k.icon className={`w-3.5 h-3.5 ${k.tone}`} />
                    <span className="truncate">{k.label}</span>
                  </div>
                  <p className="font-bold text-sm">{k.value}</p>
                  <Delta value={k.d} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales vs costs + profit line */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" />
                {t('reportsX.salesVsCosts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar name={t('reportsX.sales')} dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar name={t('reportsX.totalCosts')} dataKey="costs" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Line name={t('reportsX.netProfit')} type="monotone" dataKey="profit" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Profit trend area */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                {t('reportsX.profitTrend')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySeries}>
                    <defs>
                      <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Area type="monotone" dataKey="profit" stroke="hsl(var(--success))" fill="url(#profitFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {t('reportsX.topProducts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">{t('reportsX.noData')}</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((prod, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-1 last:border-0 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-5">#{i + 1}</span>
                        <span className="truncate">{prod.name}</span>
                      </div>
                      <div className="text-end shrink-0">
                        <div className="font-bold">{money(prod.total)}</div>
                        <div className="text-[10px] text-muted-foreground">{t('reportsX.qtySold')}: {prod.qty}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Peak hours */}
          {peakHours.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-warning" />
                  {t('reportsX.peakHours')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHours}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="hour" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey="total" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Revenue breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                {t('reportsX.revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="font-medium">{c.cashSales.toFixed(3)}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Banknote className="w-4 h-4" /><span className="text-sm">{t('reportsX.cash')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="font-medium">{c.creditSales.toFixed(3)}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CreditCard className="w-4 h-4" /><span className="text-sm">{t('reportsX.credit')}</span>
                  </div>
                </div>
              </div>
              {paymentMethodData.length > 0 && (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentMethodData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* VAT distribution */}
          {vatData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary" />
                  {t('reportsX.vatDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={vatData} cx="50%" cy="50%" innerRadius={28} outerRadius={52} dataKey="value"
                        label={({ name, percent }) => `${name} · ${(percent * 100).toFixed(0)}%`}>
                        {vatData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Costs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <TrendingDown className="w-5 h-5" />
                {t('reportsX.costsExpenses')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <span className="font-bold text-destructive text-xl">{money(c.totalCosts)}</span>
                <span className="text-muted-foreground">{t('reportsX.totalCosts')}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{money(c.totalPurchases)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('reportsX.purchases')}</span>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{money(c.totalExpenses)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('reportsX.expenses')}</span>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {expensePieData.length > 0 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={25} outerRadius={50} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {expensePieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(v: number) => money(v)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-success font-medium">{c.totalSales.toFixed(3)}</span>
                <span className="text-muted-foreground">{t('reportsX.sales')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-destructive font-medium">-{c.totalPurchases.toFixed(3)}</span>
                <span className="text-muted-foreground">{t('reportsX.purchases')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-destructive font-medium">-{c.totalExpenses.toFixed(3)}</span>
                <span className="text-muted-foreground">{t('reportsX.expenses')}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className={`font-bold text-lg ${c.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {c.netProfit >= 0 ? '+' : ''}{money(c.netProfit)}
                </span>
                <span className="font-bold">{t('reportsX.netProfit')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent sales */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('reportsX.recentSales')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cur.sales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>{t('reportsX.noSales')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cur.sales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{sale.items.length} {t('reportsX.productsCount')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.createdAt), 'dd/MM HH:mm')}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="font-bold text-success">{sale.total.toFixed(3)}</p>
                        <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'} className="text-xs">
                          {sale.paymentMethod === 'cash' ? t('reportsX.cash') : t('reportsX.credit')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tunisian VAT monthly declaration */}
          <VatReport sales={sales} />
        </div>
      </ScrollArea>
    </div>
  );
}
