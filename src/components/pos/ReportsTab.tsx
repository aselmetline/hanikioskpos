import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Banknote, CreditCard, Download, Share2, ShoppingBag, Receipt, PieChart, ArrowUpRight, ArrowDownRight, FileSpreadsheet } from 'lucide-react';
import { Sale, Purchase, Expense, EXPENSE_CATEGORIES } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays, eachDayOfInterval } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import { exportSalesReport, exportExpensesReport } from '@/utils/excelUtils';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { VatReport } from './reports/VatReport';

interface ReportsTabProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
}

export function ReportsTab({ sales, purchases, expenses }: ReportsTabProps) {
  const { t, language, dir } = useLanguage();
  const dateLocale = language === 'ar' ? ar : fr;
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'month'>('today');
  
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const filterByPeriod = <T extends { createdAt: Date }>(items: T[]): T[] => {
    if (selectedPeriod === 'today') {
      return items.filter(item => new Date(item.createdAt).toDateString() === today.toDateString());
    }
    return items.filter(item => isWithinInterval(new Date(item.createdAt), { start: monthStart, end: monthEnd }));
  };

  const filterExpensesByPeriod = (items: Expense[]): Expense[] => {
    if (selectedPeriod === 'today') {
      return items.filter(item => new Date(item.date).toDateString() === today.toDateString());
    }
    return items.filter(item => isWithinInterval(new Date(item.date), { start: monthStart, end: monthEnd }));
  };

  const filteredSales = filterByPeriod(sales);
  const filteredPurchases = filterByPeriod(purchases);
  const filteredExpenses = filterExpensesByPeriod(expenses);

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const cashSales = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const creditSales = filteredSales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.total, 0);
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const totalCosts = totalPurchases + totalExpenses;
  const netProfit = totalSales - totalCosts;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: filteredExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
  })).filter(cat => cat.total > 0);

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];

  const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
  const dailySalesData = last7Days.map(day => {
    const daySales = sales.filter(s => new Date(s.createdAt).toDateString() === day.toDateString());
    return {
      day: format(day, 'EEE', { locale: dateLocale }),
      date: format(day, 'dd/MM'),
      sales: daySales.reduce((sum, s) => sum + s.total, 0),
      count: daySales.length
    };
  });

  const paymentMethodData = [
    { name: t('reportsX.cash'), value: cashSales, color: 'hsl(var(--success))' },
    { name: t('reportsX.credit'), value: creditSales, color: 'hsl(var(--warning))' }
  ].filter(d => d.value > 0);

  const expensePieData = expensesByCategory.map((cat, idx) => ({
    name: cat.label,
    value: cat.total,
    color: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const handleExportSalesExcel = () => {
    if (filteredSales.length === 0) {
      toast.error(t('reportsX.noSalesExport'));
      return;
    }
    exportSalesReport(filteredSales);
    toast.success(t('reportsX.salesExported'));
  };

  const handleExportExpensesExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.error(t('reportsX.noExpensesExport'));
      return;
    }
    exportExpensesReport(filteredExpenses);
    toast.success(t('reportsX.expensesExported'));
  };

  const handleShareWhatsApp = () => {
    const periodLabel = selectedPeriod === 'today' ? t('reportsX.today') : t('reportsX.month');
    const message = `📊 ${t('reportsX.pnlTitle')} - ${periodLabel}\n\n📅 ${format(today, 'dd/MM/yyyy', { locale: dateLocale })}\n\n💰 ${t('reportsX.sales')}: ${totalSales.toFixed(3)} ${CURRENCY}\n🛒 ${t('reportsX.purchases')}: ${totalPurchases.toFixed(3)} ${CURRENCY}\n📋 ${t('reportsX.expenses')}: ${totalExpenses.toFixed(3)} ${CURRENCY}\n\n${netProfit >= 0 ? '✅' : '❌'} ${t('reportsX.netProfit')}: ${netProfit.toFixed(3)} ${CURRENCY}\n📈 ${t('reportsX.profitMargin')}: ${profitMargin.toFixed(1)}%`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full p-4 pb-24" dir={dir}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{t('reportsX.pnlTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {format(today, 'EEEE, d MMMM yyyy', { locale: dateLocale })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportSalesExcel} className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center" title={t('reportsX.exportSales')}>
            <FileSpreadsheet className="w-5 h-5 text-secondary-foreground" />
          </button>
          <button onClick={handleExportExpensesExcel} className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center" title={t('reportsX.exportExpenses')}>
            <Download className="w-5 h-5 text-secondary-foreground" />
          </button>
          <button onClick={handleShareWhatsApp} className="w-10 h-10 bg-success rounded-xl flex items-center justify-center">
            <Share2 className="w-5 h-5 text-success-foreground" />
          </button>
        </div>
      </div>

      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'today' | 'month')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">{t('reportsX.today')}</TabsTrigger>
          <TabsTrigger value="month">{t('reportsX.month')}</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          <Card className={`border-2 ${netProfit >= 0 ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('reportsX.netProfit')}</p>
                  <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(3)}
                  </p>
                  <p className="text-sm text-muted-foreground">{CURRENCY}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${netProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                    {netProfit >= 0 ? <ArrowUpRight className="w-8 h-8 text-success" /> : <ArrowDownRight className="w-8 h-8 text-destructive" />}
                  </div>
                  <Badge variant={netProfit >= 0 ? 'default' : 'destructive'} className="text-xs">
                    {profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                {t('reportsX.revenue')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <span className="font-bold text-success text-xl">{totalSales.toFixed(3)} {CURRENCY}</span>
                <span className="text-muted-foreground">{t('reportsX.totalSales')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="font-medium">{cashSales.toFixed(3)}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Banknote className="w-4 h-4" />
                    <span className="text-sm">{t('reportsX.cash')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="font-medium">{creditSales.toFixed(3)}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm">{t('reportsX.credit')}</span>
                  </div>
                </div>
              </div>

              {paymentMethodData.length > 0 && (
                <div className="h-32 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentMethodData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(3)} ${CURRENCY}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                {filteredSales.length} {t('reportsX.salesOps')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <BarChart3 className="w-5 h-5" />
                {t('reportsX.salesTrend')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${v}`} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(3)} ${CURRENCY}`, t('reportsX.sales')]} />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <TrendingDown className="w-5 h-5" />
                {t('reportsX.costsExpenses')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <span className="font-bold text-destructive text-xl">{totalCosts.toFixed(3)} {CURRENCY}</span>
                <span className="text-muted-foreground">{t('reportsX.totalCosts')}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{totalPurchases.toFixed(3)} {CURRENCY}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('reportsX.purchases')}</span>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {filteredPurchases.length} {t('reportsX.purchaseInvoices')}
              </p>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{totalExpenses.toFixed(3)} {CURRENCY}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('reportsX.expenses')}</span>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {expensesByCategory.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <PieChart className="w-4 h-4" />
                    {t('reportsX.expensesBreakdown')}
                  </p>
                  
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={25} outerRadius={50} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {expensePieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(3)} ${CURRENCY}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {expensesByCategory.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-2 bg-card border rounded-lg">
                        <span className="font-medium text-sm">{cat.total.toFixed(3)}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{cat.label}</span>
                          <span>{cat.icon}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-success font-medium">{totalSales.toFixed(3)}</span>
                  <span className="text-muted-foreground">{t('reportsX.sales')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-destructive font-medium">-{totalPurchases.toFixed(3)}</span>
                  <span className="text-muted-foreground">{t('reportsX.purchases')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-destructive font-medium">-{totalExpenses.toFixed(3)}</span>
                  <span className="text-muted-foreground">{t('reportsX.expenses')}</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(3)} {CURRENCY}
                  </span>
                  <span className="font-bold">{t('reportsX.netProfit')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                {t('reportsX.recentSales')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>{t('reportsX.noSales')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{sale.items.length} {t('reportsX.productsCount')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.createdAt), 'HH:mm', { locale: dateLocale })}
                        </p>
                      </div>
                      <div className="text-left">
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
        </div>
      </ScrollArea>
    </div>
  );
}
