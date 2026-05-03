import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale, Purchase, Expense, CashBoxTransaction } from '@/types/pos';
import { Store, TrendingUp, TrendingDown, Activity, ShoppingCart, ShoppingBag, Wallet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';

interface StoreActivityReportProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  transactions: CashBoxTransaction[];
  dateFrom: Date;
  dateTo: Date;
  showChart?: boolean;
}

export function StoreActivityReport({ 
  sales, 
  purchases, 
  expenses, 
  transactions,
  dateFrom, 
  dateTo,
  showChart = false 
}: StoreActivityReportProps) {
  const stats = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const filteredSales = sales.filter(s => {
      const date = new Date(s.createdAt);
      return date >= from && date <= to;
    });

    const filteredPurchases = purchases.filter(p => {
      const date = new Date(p.createdAt);
      return date >= from && date <= to;
    });

    const filteredExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date >= from && date <= to;
    });

    const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;
    
    const salesCount = filteredSales.length;
    const purchasesCount = filteredPurchases.length;
    const expensesCount = filteredExpenses.length;

    return {
      totalSales,
      totalPurchases,
      totalExpenses,
      netProfit,
      salesCount,
      purchasesCount,
      expensesCount,
      totalTransactions: salesCount + purchasesCount + expensesCount
    };
  }, [sales, purchases, expenses, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const days = eachDayOfInterval({ start: from, end: to });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = sales
        .filter(s => {
          const date = new Date(s.createdAt);
          return date >= dayStart && date <= dayEnd;
        })
        .reduce((sum, s) => sum + s.total, 0);

      const dayPurchases = purchases
        .filter(p => {
          const date = new Date(p.createdAt);
          return date >= dayStart && date <= dayEnd;
        })
        .reduce((sum, p) => sum + p.total, 0);

      const dayExpenses = expenses
        .filter(e => {
          const date = new Date(e.date);
          return date >= dayStart && date <= dayEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        date: format(day, 'MM/dd'),
        مبيعات: daySales,
        مشتريات: dayPurchases,
        مصروفات: dayExpenses
      };
    });
  }, [sales, purchases, expenses, dateFrom, dateTo]);

  return (
    <div className="space-y-4" dir={dir}>
      {/* Header Stats */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الحركات</p>
                <p className="text-2xl font-bold text-primary">{stats.totalTransactions}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">صافي الربح</p>
              <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.netProfit.toFixed(3)} TND
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 bg-green-500/20 rounded-lg mb-2">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">المبيعات</p>
              <p className="text-lg font-bold text-green-600">{stats.totalSales.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">{stats.salesCount} فاتورة</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 bg-blue-500/20 rounded-lg mb-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">المشتريات</p>
              <p className="text-lg font-bold text-blue-600">{stats.totalPurchases.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">{stats.purchasesCount} فاتورة</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-3">
            <div className="flex flex-col items-center text-center">
              <div className="p-2 bg-orange-500/20 rounded-lg mb-2">
                <Wallet className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-xs text-muted-foreground">المصروفات</p>
              <p className="text-lg font-bold text-orange-600">{stats.totalExpenses.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">{stats.expensesCount} مصروف</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>إجمالي الدخل (المبيعات)</span>
              </div>
              <span className="font-bold text-green-600">+{stats.totalSales.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-600" />
                <span>تكلفة المشتريات</span>
              </div>
              <span className="font-bold text-blue-600">-{stats.totalPurchases.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span>المصروفات التشغيلية</span>
              </div>
              <span className="font-bold text-orange-600">-{stats.totalExpenses.toFixed(3)} TND</span>
            </div>
            <div className="flex justify-between items-center py-2 bg-muted/50 rounded-lg px-2">
              <div className="flex items-center gap-2">
                <Activity className={`h-4 w-4 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <span className="font-medium">صافي الربح</span>
              </div>
              <span className={`font-bold text-lg ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(3)} TND
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {showChart && chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">الرسم البياني للحركة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(3)} TND`} />
                  <Legend />
                  <Line type="monotone" dataKey="مبيعات" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="مشتريات" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="مصروفات" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
