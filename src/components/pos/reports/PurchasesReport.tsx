import { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Purchase } from '@/types/pos';
import { ShoppingBag, Receipt, Package, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PurchasesReportProps {
  purchases: Purchase[];
  dateFrom: Date;
  dateTo: Date;
}

export function PurchasesReport({ purchases, dateFrom, dateTo }: PurchasesReportProps) {
  const { t, dir } = useLanguage();
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.invoiceDate);
      purchaseDate.setHours(0, 0, 0, 0);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      return purchaseDate >= from && purchaseDate <= to;
    });
  }, [purchases, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
    const totalItems = filteredPurchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0);
    const averagePerInvoice = filteredPurchases.length > 0 ? totalPurchases / filteredPurchases.length : 0;
    
    return {
      totalPurchases,
      totalItems,
      invoiceCount: filteredPurchases.length,
      averagePerInvoice
    };
  }, [filteredPurchases]);

  return (
    <div className="space-y-4" dir={dir}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('reportsX.totalPurchases')}</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalPurchases.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('reportsX.invoicesCount')}</p>
                <p className="text-xl font-bold text-primary">{stats.invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عدد الأصناف</p>
                <p className="text-xl font-bold text-green-600">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">متوسط الفاتورة</p>
                <p className="text-xl font-bold text-orange-600">{stats.averagePerInvoice.toFixed(3)} TND</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">فواتير المشتريات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الفاتورة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">عدد الأصناف</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      لا توجد مشتريات في هذه الفترة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <Badge variant="outline">#{purchase.invoiceNumber}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(purchase.invoiceDate), 'yyyy/MM/dd')}</TableCell>
                      <TableCell>{purchase.supplierName || '-'}</TableCell>
                      <TableCell>{purchase.items.reduce((sum, i) => sum + i.quantity, 0)}</TableCell>
                      <TableCell className="font-medium">{purchase.total.toFixed(3)} TND</TableCell>
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
