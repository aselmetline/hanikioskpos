import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Customer, Sale } from '@/types/pos';
import { Users, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerDebtsReportProps {
  customers: Customer[];
  sales: Sale[];
  dateFrom: Date;
  dateTo: Date;
}

export function CustomerDebtsReport({ customers, sales, dateFrom, dateTo }: CustomerDebtsReportProps) {
  const { t } = useLanguage();
  const customersWithDebts = useMemo(() => {
    return customers.filter(c => c.creditBalance > 0).sort((a, b) => b.creditBalance - a.creditBalance);
  }, [customers]);

  const stats = useMemo(() => {
    const totalDebts = customersWithDebts.reduce((sum, c) => sum + c.creditBalance, 0);
    const customersCount = customersWithDebts.length;
    const highDebtCustomers = customersWithDebts.filter(c => c.creditBalance > 100).length;
    
    return {
      totalDebts,
      customersCount,
      highDebtCustomers,
      averageDebt: customersCount > 0 ? totalDebts / customersCount : 0
    };
  }, [customersWithDebts]);

  const customerSalesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    sales.forEach(sale => {
      if (sale.customerId && sale.paymentMethod === 'credit') {
        counts[sale.customerId] = (counts[sale.customerId] || 0) + 1;
      }
    });
    return counts;
  }, [sales]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('customers.creditBalance')}</p>
                <p className="text-xl font-bold text-red-600">{stats.totalDebts.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('customers.title')}</p>
                <p className="text-xl font-bold text-blue-600">{stats.customersCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">&gt; 100 TND</p>
                <p className="text-xl font-bold text-orange-600">{stats.highDebtCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.averageSale')}</p>
                <p className="text-xl font-bold text-primary">{stats.averageDebt.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('reports.customerDebts')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t('common.customer')}</TableHead>
                  <TableHead className="text-right">{t('common.phone')}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead className="text-right">{t('common.invoice')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersWithDebts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  customersWithDebts.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={customer.creditBalance > 100 ? 'destructive' : 'secondary'}>
                          {customer.creditBalance.toFixed(3)} TND
                        </Badge>
                      </TableCell>
                      <TableCell>{customerSalesCount[customer.id] || 0}</TableCell>
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
