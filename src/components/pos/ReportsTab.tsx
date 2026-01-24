import { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Banknote, CreditCard, Download, Share2, ShoppingBag, Receipt, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Sale, Purchase, Expense, EXPENSE_CATEGORIES } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

interface ReportsTabProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
}

export function ReportsTab({ sales, purchases, expenses }: ReportsTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'month'>('today');
  
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Filter data based on period
  const filterByPeriod = <T extends { createdAt: Date }>(items: T[]): T[] => {
    if (selectedPeriod === 'today') {
      return items.filter(item => 
        new Date(item.createdAt).toDateString() === today.toDateString()
      );
    }
    return items.filter(item => 
      isWithinInterval(new Date(item.createdAt), { start: monthStart, end: monthEnd })
    );
  };

  const filterExpensesByPeriod = (items: Expense[]): Expense[] => {
    if (selectedPeriod === 'today') {
      return items.filter(item => 
        new Date(item.date).toDateString() === today.toDateString()
      );
    }
    return items.filter(item => 
      isWithinInterval(new Date(item.date), { start: monthStart, end: monthEnd })
    );
  };

  const filteredSales = filterByPeriod(sales);
  const filteredPurchases = filterByPeriod(purchases);
  const filteredExpenses = filterExpensesByPeriod(expenses);

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const cashSales = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const creditSales = filteredSales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.total, 0);
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate profit/loss
  const totalCosts = totalPurchases + totalExpenses;
  const netProfit = totalSales - totalCosts;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Expense breakdown by category
  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: filteredExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
  })).filter(cat => cat.total > 0);

  const handleExportPDF = () => {
    alert('سيتم تصدير التقرير كـ PDF');
  };

  const handleShareWhatsApp = () => {
    const periodLabel = selectedPeriod === 'today' ? 'اليوم' : 'الشهر';
    const message = `📊 تقرير الأرباح والخسائر - ${periodLabel}\n\n📅 ${format(today, 'dd/MM/yyyy', { locale: ar })}\n\n💰 المبيعات: ${totalSales.toFixed(3)} ${CURRENCY}\n🛒 المشتريات: ${totalPurchases.toFixed(3)} ${CURRENCY}\n📋 المصروفات: ${totalExpenses.toFixed(3)} ${CURRENCY}\n\n${netProfit >= 0 ? '✅' : '❌'} صافي الربح: ${netProfit.toFixed(3)} ${CURRENCY}\n📈 هامش الربح: ${profitMargin.toFixed(1)}%`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">تقرير الأرباح والخسائر</h2>
          <p className="text-sm text-muted-foreground">
            {format(today, 'EEEE, d MMMM yyyy', { locale: ar })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center"
          >
            <Download className="w-5 h-5 text-secondary-foreground" />
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="w-10 h-10 bg-success rounded-xl flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-success-foreground" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'today' | 'month')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">اليوم</TabsTrigger>
          <TabsTrigger value="month">الشهر</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {/* Net Profit Card */}
          <Card className={`border-2 ${netProfit >= 0 ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">صافي الربح</p>
                  <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(3)}
                  </p>
                  <p className="text-sm text-muted-foreground">{CURRENCY}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${netProfit >= 0 ? 'bg-success/20' : 'bg-destructive/20'}`}>
                    {netProfit >= 0 ? (
                      <ArrowUpRight className="w-8 h-8 text-success" />
                    ) : (
                      <ArrowDownRight className="w-8 h-8 text-destructive" />
                    )}
                  </div>
                  <Badge variant={netProfit >= 0 ? 'default' : 'destructive'} className="text-xs">
                    {profitMargin.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-success">
                <TrendingUp className="w-5 h-5" />
                الإيرادات (المبيعات)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <span className="font-bold text-success text-xl">{totalSales.toFixed(3)} {CURRENCY}</span>
                <span className="text-muted-foreground">إجمالي المبيعات</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="font-medium">{cashSales.toFixed(3)}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Banknote className="w-4 h-4" />
                    <span className="text-sm">نقدي</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                  <span className="font-medium">{creditSales.toFixed(3)}</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm">آجل</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {filteredSales.length} عملية بيع
              </p>
            </CardContent>
          </Card>

          {/* Costs Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <TrendingDown className="w-5 h-5" />
                التكاليف والمصروفات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <span className="font-bold text-destructive text-xl">{totalCosts.toFixed(3)} {CURRENCY}</span>
                <span className="text-muted-foreground">إجمالي التكاليف</span>
              </div>
              
              {/* Purchases */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{totalPurchases.toFixed(3)} {CURRENCY}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">المشتريات</span>
                  <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {filteredPurchases.length} فاتورة مشتريات
              </p>

              {/* Expenses */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">{totalExpenses.toFixed(3)} {CURRENCY}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">المصروفات</span>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Expense Breakdown */}
              {expensesByCategory.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <PieChart className="w-4 h-4" />
                    تفصيل المصروفات
                  </p>
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

          {/* Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-success font-medium">{totalSales.toFixed(3)}</span>
                  <span className="text-muted-foreground">المبيعات</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-destructive font-medium">-{totalPurchases.toFixed(3)}</span>
                  <span className="text-muted-foreground">المشتريات</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-destructive font-medium">-{totalExpenses.toFixed(3)}</span>
                  <span className="text-muted-foreground">المصروفات</span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between items-center">
                  <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(3)} {CURRENCY}
                  </span>
                  <span className="font-bold">صافي الربح</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                آخر المبيعات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>لا توجد مبيعات</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{sale.items.length} منتج</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sale.createdAt), 'HH:mm', { locale: ar })}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-success">{sale.total.toFixed(3)}</p>
                        <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'} className="text-xs">
                          {sale.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
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
