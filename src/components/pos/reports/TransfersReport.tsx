import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeftRight, Coins, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { Product } from '@/types/pos';
import type { InternalTransfer } from '@/hooks/useInternalTransfers';
import { useLanguage } from '@/contexts/LanguageContext';

interface TransfersReportProps {
  transfers: InternalTransfer[];
  products?: Product[];
  dateFrom: Date;
  dateTo: Date;
}

interface ProductBalance {
  id: string;
  name: string;
  outQty: number;
  inQty: number;
  outValue: number;
  inValue: number;
  stock?: number;
}

export function TransfersReport({ transfers, products = [], dateFrom, dateTo }: TransfersReportProps) {
  const { t } = useLanguage();

  const { filtered, totals, balances } = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const filtered = transfers
      .filter(tr => tr.createdAt >= from && tr.createdAt <= to)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const totals = filtered.reduce(
      (acc, tr) => ({
        count: acc.count + 1,
        value: acc.value + tr.sourceTotalValue,
        remainder: acc.remainder + tr.remainderValue,
      }),
      { count: 0, value: 0, remainder: 0 },
    );

    const map = new Map<string, ProductBalance>();
    const touch = (id: string | null, name: string): ProductBalance => {
      const key = id || `name:${name}`;
      if (!map.has(key)) {
        map.set(key, { id: key, name, outQty: 0, inQty: 0, outValue: 0, inValue: 0 });
      }
      return map.get(key)!;
    };

    for (const tr of filtered) {
      const src = touch(tr.sourceProductId, tr.sourceProductName);
      src.outQty += tr.sourceQuantity;
      src.outValue += tr.sourceTotalValue;

      const tgt = touch(tr.targetProductId, tr.targetProductName);
      tgt.inQty += tr.targetQuantity;
      tgt.inValue += tr.targetQuantity * tr.targetUnitPrice;
    }

    for (const b of map.values()) {
      const p = products.find(pr => pr.id === b.id);
      if (p) b.stock = p.stock;
    }

    const balances = Array.from(map.values()).sort(
      (a, b) => b.inQty + b.outQty - (a.inQty + a.outQty),
    );

    return { filtered, totals, balances };
  }, [transfers, products, dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-3 text-center">
            <Repeat className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold text-primary">{totals.count}</p>
            <p className="text-xs text-muted-foreground">{t('reports.transfers')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-3 text-center">
            <Coins className="w-5 h-5 mx-auto mb-1 text-success" />
            <p className="text-xl font-bold text-success">{totals.value.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">{t('transfers.sourceValue')}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-3 text-center">
            <ArrowLeftRight className="w-5 h-5 mx-auto mb-1 text-orange-600" />
            <p className="text-xl font-bold text-orange-600">{totals.remainder.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">{t('transfers.remainder')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Transfers by date */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('transfers.history')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[320px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('common.date')}</TableHead>
                  <TableHead className="text-start">{t('transfers.source')}</TableHead>
                  <TableHead className="text-start">{t('transfers.target')}</TableHead>
                  <TableHead className="text-center">{t('transfers.sourceValue')}</TableHead>
                  <TableHead className="text-center">{t('transfers.remainder')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('transfers.noHistory')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(tr => (
                    <TableRow key={tr.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(tr.createdAt, 'yyyy/MM/dd HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tr.sourceQuantity} × {tr.sourceProductName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tr.targetQuantity} × {tr.targetProductName}
                      </TableCell>
                      <TableCell className="text-center font-medium">{tr.sourceTotalValue.toFixed(3)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{tr.remainderValue.toFixed(3)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Balance per product */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('transfers.productBalance')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[320px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('common.product')}</TableHead>
                  <TableHead className="text-center">{t('transfers.outQty')}</TableHead>
                  <TableHead className="text-center">{t('transfers.inQty')}</TableHead>
                  <TableHead className="text-center">{t('transfers.netQty')}</TableHead>
                  <TableHead className="text-center">{t('transfers.currentStock')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t('transfers.noHistory')}
                    </TableCell>
                  </TableRow>
                ) : (
                  balances.map(b => {
                    const net = b.inQty - b.outQty;
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-center text-destructive">
                          {b.outQty ? `-${b.outQty}` : '—'}
                        </TableCell>
                        <TableCell className="text-center text-success">
                          {b.inQty ? `+${b.inQty}` : '—'}
                        </TableCell>
                        <TableCell
                          className={`text-center font-bold ${net > 0 ? 'text-success' : net < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                          {net > 0 ? `+${net}` : net}
                        </TableCell>
                        <TableCell className="text-center">{b.stock ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
