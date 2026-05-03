import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CashBoxTransaction } from '@/types/pos';
import { Wallet, ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { eachDayOfInterval, startOfDay } from 'date-fns';

interface CashBoxReportProps {
  transactions: CashBoxTransaction[];
  balance: number;
  dateFrom: Date;
  dateTo: Date;
}

export function CashBoxReport({ transactions, balance, dateFrom, dateTo }: CashBoxReportProps) {
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const txDate = new Date(t.date);
      txDate.setHours(0, 0, 0, 0);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      return txDate >= from && txDate <= to;
    });
  }, [transactions, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalAdded = filteredTransactions.filter(t => t.type === 'add').reduce((sum, t) => sum + t.amount, 0);
    const totalDeducted = filteredTransactions.filter(t => t.type === 'deduct').reduce((sum, t) => sum + t.amount, 0);
    const netChange = totalAdded - totalDeducted;
    
    const bySales = filteredTransactions.filter(t => t.category === 'sales').reduce((sum, t) => t.type === 'add' ? sum + t.amount : sum - t.amount, 0);
    const byPurchases = filteredTransactions.filter(t => t.category === 'purchases').reduce((sum, t) => t.type === 'add' ? sum + t.amount : sum - t.amount, 0);
    const byExpenses = filteredTransactions.filter(t => t.category === 'expenses').reduce((sum, t) => t.type === 'add' ? sum + t.amount : sum - t.amount, 0);
    const byManual = filteredTransactions.filter(t => t.category === 'manual').reduce((sum, t) => t.type === 'add' ? sum + t.amount : sum - t.amount, 0);

    return {
      totalAdded,
      totalDeducted,
      netChange,
      bySales,
      byPurchases,
      byExpenses,
      byManual,
      transactionCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const days = eachDayOfInterval({ start: from, end: to });
    let runningBalance = 0;

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTransactions = filteredTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dayStart && txDate <= dayEnd;
      });

      const dayChange = dayTransactions.reduce((sum, t) => 
        t.type === 'add' ? sum + t.amount : sum - t.amount, 0
      );

      runningBalance += dayChange;

      return {
        date: format(day, 'MM/dd'),
        رصيد: runningBalance
      };
    });
  }, [filteredTransactions, dateFrom, dateTo]);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'sales': return 'مبيعات';
      case 'purchases': return 'مشتريات';
      case 'expenses': return 'مصروفات';
      case 'manual': return 'يدوي';
      default: return category;
    }
  };

  return (
    <div className="space-y-4" dir={dir}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                <p className="text-xl font-bold text-primary">{balance.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الإيداعات</p>
                <p className="text-xl font-bold text-green-600">{stats.totalAdded.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي السحوبات</p>
                <p className="text-xl font-bold text-red-600">{stats.totalDeducted.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-gradient-to-br ${stats.netChange >= 0 ? 'from-blue-500/10 to-blue-500/5' : 'from-orange-500/10 to-orange-500/5'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.netChange >= 0 ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
                <TrendingUp className={`h-5 w-5 ${stats.netChange >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي التغيير</p>
                <p className={`text-xl font-bold ${stats.netChange >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {stats.netChange >= 0 ? '+' : ''}{stats.netChange.toFixed(3)} TND
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">من المبيعات:</span>
              <span className="font-medium text-green-600">+{stats.bySales.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">من المشتريات:</span>
              <span className="font-medium text-red-600">{stats.byPurchases.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">من المصروفات:</span>
              <span className="font-medium text-orange-600">{stats.byExpenses.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">يدوي:</span>
              <span className={`font-medium ${stats.byManual >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {stats.byManual >= 0 ? '+' : ''}{stats.byManual.toFixed(3)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">حركة الرصيد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(3)} TND`} />
                  <Area 
                    type="monotone" 
                    dataKey="رصيد" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary) / 0.2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">سجل الحركات ({stats.transactionCount})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الفئة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      لا توجد حركات في هذه الفترة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(new Date(tx.date), 'MM/dd HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'add' ? 'default' : 'destructive'}>
                          {tx.type === 'add' ? 'إيداع' : 'سحب'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getCategoryLabel(tx.category)}</TableCell>
                      <TableCell className={`font-medium ${tx.type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'add' ? '+' : '-'}{tx.amount.toFixed(3)}
                      </TableCell>
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
