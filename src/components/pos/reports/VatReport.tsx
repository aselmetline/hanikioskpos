import { useMemo, useState } from 'react';
import { FileSpreadsheet, Share2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sale } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface VatReportProps {
  sales: Sale[];
}

interface RateRow {
  rate: number;
  base: number;
  tax: number;
}

/**
 * Monthly Tunisian VAT (TVA) declaration report.
 * Aggregates HT / TVA / TTC per rate + fiscal stamp for the selected month.
 */
export function VatReport({ sales }: VatReportProps) {
  const { language, dir } = useLanguage();
  const dateLocale = language === 'ar' ? ar : fr;
  const [monthOffset, setMonthOffset] = useState<number>(0); // 0 = current month

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return { value: i, label: format(d, 'MMMM yyyy', { locale: dateLocale }), date: d };
    }),
    [dateLocale]
  );

  const selected = months[monthOffset];
  const monthStart = startOfMonth(selected.date);
  const monthEnd = endOfMonth(selected.date);

  const monthSales = sales.filter(s =>
    isWithinInterval(new Date(s.createdAt), { start: monthStart, end: monthEnd })
  );

  const { rows, totalHT, totalTax, totalStamp, totalTTC } = useMemo(() => {
    const acc: Record<string, RateRow> = {};
    let totalStamp = 0;

    for (const s of monthSales) {
      totalStamp += s.fiscalStamp || 0;
      const bd = s.taxBreakdown;
      if (bd && Object.keys(bd).length > 0) {
        for (const [rateKey, v] of Object.entries(bd)) {
          const rate = Number(rateKey);
          if (!acc[rateKey]) acc[rateKey] = { rate, base: 0, tax: 0 };
          acc[rateKey].base += Number(v.base) || 0;
          acc[rateKey].tax += Number(v.tax) || 0;
        }
      } else {
        // Legacy sales without breakdown: infer single rate from tax/(subtotal-discount)
        const base = Math.max(0, (s.subtotal || 0) - (s.discount || 0));
        const rate = base > 0 ? Math.round((s.tax / base) * 100) / 100 : 0;
        const key = rate.toFixed(2);
        if (!acc[key]) acc[key] = { rate, base: 0, tax: 0 };
        acc[key].base += base;
        acc[key].tax += s.tax || 0;
      }
    }

    const rows = Object.values(acc).sort((a, b) => a.rate - b.rate);
    const totalHT = rows.reduce((sum, r) => sum + r.base, 0);
    const totalTax = rows.reduce((sum, r) => sum + r.tax, 0);
    const totalTTC = totalHT + totalTax + totalStamp;

    return { rows, totalHT, totalTax, totalStamp, totalTTC };
  }, [monthSales]);

  const exportCSV = () => {
    const lines: string[] = [];
    lines.push('Taux TVA;Base HT (TND);TVA (TND);TTC (TND)');
    for (const r of rows) {
      const ttc = r.base + r.tax;
      lines.push(`${(r.rate * 100).toFixed(0)}%;${r.base.toFixed(3)};${r.tax.toFixed(3)};${ttc.toFixed(3)}`);
    }
    lines.push('');
    lines.push(`Total HT;${totalHT.toFixed(3)}`);
    lines.push(`Total TVA;${totalTax.toFixed(3)}`);
    lines.push(`Timbre fiscal;${totalStamp.toFixed(3)}`);
    lines.push(`Total TTC;${totalTTC.toFixed(3)}`);
    lines.push(`Nombre de factures;${monthSales.length}`);

    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TVA-${format(selected.date, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsApp = () => {
    const lines = [
      `📄 تصريح TVA - ${selected.label}`,
      '',
      ...rows.map(r => `• TVA ${(r.rate * 100).toFixed(0)}%: base ${r.base.toFixed(3)} → ${r.tax.toFixed(3)} TND`),
      '',
      `HT الجملي: ${totalHT.toFixed(3)} TND`,
      `TVA الجملي: ${totalTax.toFixed(3)} TND`,
      `الطابع الجبائي: ${totalStamp.toFixed(3)} TND`,
      `TTC الجملي: ${totalTTC.toFixed(3)} TND`,
      `عدد الفواتير: ${monthSales.length}`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <div className="space-y-4" dir={dir}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-5 h-5 text-primary" />
            تصريح TVA الشهري (Déclaration mensuelle TVA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="min-w-[200px] flex-1">
              <Select value={String(monthOffset)} onValueChange={(v) => setMonthOffset(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="pos-button-outline text-sm px-3 py-2 gap-1">
                <FileSpreadsheet className="w-4 h-4" /> CSV
              </button>
              <button onClick={shareWhatsApp} className="pos-button text-sm px-3 py-2 gap-1 bg-success text-success-foreground">
                <Share2 className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-start p-2">معدل TVA</th>
                  <th className="text-end p-2">Base HT</th>
                  <th className="text-end p-2">TVA</th>
                  <th className="text-end p-2">TTC</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">لا توجد فواتير لهذا الشهر</td></tr>
                ) : rows.map(r => (
                  <tr key={r.rate.toFixed(2)} className="border-b">
                    <td className="p-2 font-medium">{(r.rate * 100).toFixed(0)}%</td>
                    <td className="p-2 text-end" dir="ltr">{r.base.toFixed(3)}</td>
                    <td className="p-2 text-end font-semibold" dir="ltr">{r.tax.toFixed(3)}</td>
                    <td className="p-2 text-end" dir="ltr">{(r.base + r.tax).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Total HT</p>
              <p className="font-bold text-lg" dir="ltr">{totalHT.toFixed(3)} {CURRENCY}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Total TVA</p>
              <p className="font-bold text-lg text-primary" dir="ltr">{totalTax.toFixed(3)} {CURRENCY}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Timbre fiscal</p>
              <p className="font-bold text-lg" dir="ltr">{totalStamp.toFixed(3)} {CURRENCY}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Total TTC</p>
              <p className="font-bold text-lg text-success" dir="ltr">{totalTTC.toFixed(3)} {CURRENCY}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {monthSales.length} فاتورة خلال {selected.label}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
