import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Supplier } from '@/hooks/useSuppliers';
import { Purchase } from '@/types/pos';
import { Truck, Banknote, ShoppingBag } from 'lucide-react';

interface SuppliersReportProps {
  suppliers: Supplier[];
  purchases: Purchase[];
}

export function SuppliersReport({ suppliers, purchases }: SuppliersReportProps) {
  const stats = useMemo(() => {
    const totalDebt = suppliers.reduce((sum, s) => sum + s.debtBalance, 0);
    const suppliersWithDebt = suppliers.filter(s => s.debtBalance > 0).length;
    const purchasesBySupplier = suppliers.map(s => ({
      ...s,
      purchaseCount: purchases.filter(p => p.supplierId === s.id).length,
      purchaseTotal: purchases.filter(p => p.supplierId === s.id).reduce((sum, p) => sum + p.total, 0),
    }));
    return { totalDebt, suppliersWithDebt, purchasesBySupplier };
  }, [suppliers, purchases]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3 text-center">
            <Truck className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">{suppliers.length}</p>
            <p className="text-xs text-muted-foreground">الموردين</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
          <CardContent className="p-3 text-center">
            <Banknote className="w-5 h-5 mx-auto mb-1 text-destructive" />
            <p className="text-xl font-bold text-destructive">{stats.totalDebt.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">إجمالي الديون</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-3 text-center">
            <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-orange-600" />
            <p className="text-xl font-bold text-orange-600">{stats.suppliersWithDebt}</p>
            <p className="text-xs text-muted-foreground">مورد بدين</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">تفاصيل الموردين</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[350px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-center">الفواتير</TableHead>
                  <TableHead className="text-center">إجمالي المشتريات</TableHead>
                  <TableHead className="text-center">رصيد الدين</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      لا يوجد موردين
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.purchasesBySupplier.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-center">{s.purchaseCount}</TableCell>
                      <TableCell className="text-center">{s.purchaseTotal.toFixed(3)}</TableCell>
                      <TableCell className={`text-center font-bold ${s.debtBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {s.debtBalance.toFixed(3)}
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
