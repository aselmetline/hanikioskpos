import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Expense, EXPENSE_CATEGORIES } from '@/types/pos';
import { Wallet, Receipt, TrendingDown, PieChart } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExpensesReportProps {
  expenses: Expense[];
  dateFrom: Date;
  dateTo: Date;
}

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export function ExpensesReport({ expenses, dateFrom, dateTo }: ExpensesReportProps) {
  const { t, dir } = useLanguage();
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      return expenseDate >= from && expenseDate <= to;
    });
  }, [expenses, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const count = filteredExpenses.length;
    const averageExpense = count > 0 ? totalExpenses / count : 0;
    
    const byCategory = EXPENSE_CATEGORIES.map(cat => ({
      id: cat.id,
      label: cat.label,
      icon: cat.icon,
      total: filteredExpenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0)
    })).filter(c => c.total > 0);

    return {
      totalExpenses,
      count,
      averageExpense,
      byCategory
    };
  }, [filteredExpenses]);

  const pieData = stats.byCategory.map((cat, index) => ({
    name: cat.label,
    value: cat.total,
    color: COLORS[index % COLORS.length]
  }));

  const getCategoryLabel = (categoryId: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
    return cat ? `${cat.icon} ${cat.label}` : categoryId;
  };

  return (
    <div className="space-y-4" dir={dir}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('reportsX.totalExpenses')}</p>
                <p className="text-xl font-bold text-red-600">{stats.totalExpenses.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد المصروفات</p>
                <p className="text-xl font-bold text-blue-600">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط المصروف</p>
                <p className="text-xl font-bold text-primary">{stats.averageExpense.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {stats.byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              توزيع المصروفات حسب الفئة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(3)} TND`} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">تفاصيل المصروفات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الفئة</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      لا توجد مصروفات في هذه الفترة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryLabel(expense.category)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">{expense.description || '-'}</TableCell>
                      <TableCell className="font-medium text-red-600">{expense.amount.toFixed(3)} TND</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
