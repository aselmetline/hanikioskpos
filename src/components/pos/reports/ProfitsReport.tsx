import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale, Purchase, Expense } from '@/types/pos';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProfitsReportProps {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  dateFrom: Date;
  dateTo: Date;
}

export function ProfitsReport({ sales, purchases, expenses, dateFrom, dateTo }: ProfitsReportProps) {
  const { t, language, dir } = useLanguage();
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

    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = totalRevenue - totalPurchases;
    const netProfit = grossProfit - totalExpenses;

    return {
      totalRevenue,
      totalPurchases,
      totalExpenses,
      grossProfit,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    };
  }, [sales, purchases, expenses, dateFrom, dateTo]);

  const dailyData = useMemo(() => {
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

      const dayExpenses = expenses
        .filter(e => {
          const date = new Date(e.date);
          return date >= dayStart && date <= dayEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        date: format(day, 'MM/dd'),
        مبيعات: daySales,
        مصروفات: dayExpenses
      };
    });
  }, [sales, expenses, dateFrom, dateTo]);

  const pieData = [
    { name: t('reportsX.purchases'), value: stats.totalPurchases, color: '#3b82f6' },
    { name: t('reportsX.expenses'), value: stats.totalExpenses, color: '#f97316' },
    { name: t('reportsX.netProfit'), value: Math.max(0, stats.netProfit), color: '#22c55e' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-4" dir={dir}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-xl font-bold text-green-600">{stats.totalRevenue.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تكلفة المشتريات</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalPurchases.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المصروفات</p>
                <p className="text-xl font-bold text-orange-600">{stats.totalExpenses.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${stats.netProfit >= 0 ? 'from-primary/10 to-primary/5' : 'from-red-500/10 to-red-500/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.netProfit >= 0 ? 'bg-primary/20' : 'bg-red-500/20'}`}>
                <TrendingUp className={`h-5 w-5 ${stats.netProfit >= 0 ? 'text-primary' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                  {stats.netProfit.toFixed(3)} TND
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Margin */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-medium">هامش الربح</span>
            </div>
            <span className={`text-xl font-bold ${stats.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.profitMargin.toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">المبيعات vs المصروفات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="مبيعات" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="مصروفات" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">توزيع الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(3)} TND`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
