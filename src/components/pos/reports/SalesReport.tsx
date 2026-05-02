import { useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types/pos';
import { ShoppingCart, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SalesReportProps {
  sales: Sale[];
  dateFrom: Date;
  dateTo: Date;
}

export function SalesReport({ sales, dateFrom, dateTo }: SalesReportProps) {
  const { t } = useLanguage();
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      saleDate.setHours(0, 0, 0, 0);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      return saleDate >= from && saleDate <= to;
    });
  }, [sales, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
    const totalTax = filteredSales.reduce((sum, s) => sum + s.tax, 0);
    const totalDiscount = filteredSales.reduce((sum, s) => sum + s.discount, 0);
    const cashSales = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
    const creditSales = filteredSales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.total, 0);
    
    return {
      totalSales,
      totalTax,
      totalDiscount,
      cashSales,
      creditSales,
      count: filteredSales.length
    };
  }, [filteredSales]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.totalRevenue')}</p>
                <p className="text-xl font-bold text-primary">{stats.totalSales.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('reports.salesCount')}</p>
                <p className="text-xl font-bold text-green-600">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('common.cash')}</p>
                <p className="text-xl font-bold text-blue-600">{stats.cashSales.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('common.credit')}</p>
                <p className="text-xl font-bold text-orange-600">{stats.creditSales.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax & Discount Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">{t('common.tax')}</p>
              <p className="font-bold">{stats.totalTax.toFixed(3)} TND</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('common.discount')}</p>
              <p className="font-bold text-red-500">{stats.totalDiscount.toFixed(3)} TND</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('common.invoice')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{t('common.date')}</TableHead>
                  <TableHead className="text-right">{t('common.amount')}</TableHead>
                  <TableHead className="text-right">{t('common.tax')}</TableHead>
                  <TableHead className="text-right">{t('common.type')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.createdAt), 'yyyy/MM/dd HH:mm')}</TableCell>
                      <TableCell className="font-medium">{sale.total.toFixed(3)} TND</TableCell>
                      <TableCell>{sale.tax.toFixed(3)} TND</TableCell>
                      <TableCell>
                        <Badge variant={sale.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                          {sale.paymentMethod === 'cash' ? t('common.cash') : t('common.credit')}
                        </Badge>
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
