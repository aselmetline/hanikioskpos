import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { startOfDay, endOfDay, subDays, startOfMonth, format } from 'date-fns';
import { Sale, Product, Customer } from '@/types/pos';
import { categories } from '@/data/sampleData';
import { CURRENCY } from '@/data/sampleData';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, Printer, Share2 } from 'lucide-react';
import { byProduct, byCategory, byInvoice, byCustomer, capital, zakat, ProfitRow, makeCostLookup, lineFigures, r3 } from '@/lib/profitCalc';

interface Props {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  supplierDebts: number;
  cashBalance: number;
}

type ReportKey = 'total' | 'product' | 'invoice' | 'customer' | 'category' | 'capital' | 'zakat';
type Period = 'today' | 'last7' | 'month' | 'all';

export function ProfitCenter({ sales, products, customers, supplierDebts, cashBalance }: Props) {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const L = (a: string, f: string) => (ar ? a : f);
  const money = (v: number) => `${v.toFixed(3)} ${CURRENCY}`;

  const [report, setReport] = useState<ReportKey>('total');
  const [period, setPeriod] = useState<Period>('month');
  const [nisab, setNisab] = useState<string>(() => localStorage.getItem('zakat_nisab') || '');

  const periodSales = useMemo(() => {
    const now = new Date();
    const start = period === 'today' ? startOfDay(now) : period === 'last7' ? startOfDay(subDays(now, 6)) : period === 'month' ? startOfMonth(now) : new Date(0);
    const end = endOfDay(now);
    return sales.filter(s => { const d = new Date(s.createdAt); return d >= start && d <= end; });
  }, [sales, period]);

  const catLabel = (id: string) => {
    const c = categories.find(c => c.id === id);
    return c ? `${c.icon} ${ar ? c.nameAr : c.name}` : id === 'other' ? L('أخرى', 'Autres') : id;
  };

  const totals = useMemo(() => {
    const costOf = makeCostLookup(products);
    let revenue = 0, cost = 0;
    periodSales.forEach(s => { s.items.forEach(it => { const f = lineFigures(it, costOf); revenue += f.revenue; cost += f.cost; }); revenue -= s.discount || 0; });
    const profit = revenue - cost;
    return { revenue: r3(revenue), cost: r3(cost), profit: r3(profit), margin: revenue > 0 ? (profit / revenue) * 100 : 0, count: periodSales.length };
  }, [periodSales, products]);

  const rows: ProfitRow[] = useMemo(() => {
    switch (report) {
      case 'product': return byProduct(periodSales, products, ar);
      case 'invoice': return byInvoice(periodSales, products);
      case 'customer': return byCustomer(periodSales, products, customers, L('حريف عابر', 'Client de passage'));
      case 'category': return byCategory(periodSales, products, catLabel);
      default: return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, periodSales, products, customers, ar]);

  const cap = useMemo(() => capital(products), [products]);
  const receivables = customers.reduce((s, c) => s + Math.max(0, c.creditBalance), 0);
  const zk = zakat({ stockCost: cap.costValue, cash: cashBalance, receivables, payables: supplierDebts, nisab: Number(nisab) || 0 });
  const missingCost = products.filter(p => !p.cost).length;

  const reports: { key: ReportKey; label: string }[] = [
    { key: 'total', label: L('المبيعات والأرباح', 'Ventes & marges') },
    { key: 'product', label: L('حسب الصنف', 'Par produit') },
    { key: 'invoice', label: L('حسب الفاتورة', 'Par facture') },
    { key: 'customer', label: L('حسب العميل', 'Par client') },
    { key: 'category', label: L('حسب التصنيف', 'Par catégorie') },
    { key: 'capital', label: L('رأس المال', 'Capital') },
    { key: 'zakat', label: L('الزكاة', 'Zakat') },
  ];
  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: L('اليوم', "Aujourd'hui") },
    { key: 'last7', label: L('7 أيام', '7 jours') },
    { key: 'month', label: L('هذا الشهر', 'Ce mois') },
    { key: 'all', label: L('الكل', 'Tout') },
  ];
  const currentLabel = reports.find(r => r.key === report)!.label;
  const periodLabel = periods.find(p => p.key === period)!.label;

  const summaryLines = (): [string, string][] => {
    if (report === 'capital') return [
      [L('عدد الوحدات بالمخزون', 'Unités en stock'), String(cap.units)],
      [L('رأس المال (بسعر الشراء)', 'Capital (prix d’achat)'), money(cap.costValue)],
      [L('قيمة المخزون (بسعر البيع)', 'Valeur (prix de vente)'), money(cap.saleValue)],
      [L('الربح المباشر المتوقع', 'Marge attendue'), money(cap.expectedProfit)],
    ];
    if (report === 'zakat') return [
      [L('البضاعة بسعر الشراء', 'Stock au coût'), money(cap.costValue)],
      [L('السيولة في الكاسة', 'Liquidités caisse'), money(cashBalance)],
      [L('ديون الحرفاء', 'Créances clients'), money(receivables)],
      [L('ديون الموردين (تُخصم)', 'Dettes fournisseurs (−)'), money(supplierDebts)],
      [L('الوعاء الزكوي', 'Assiette'), money(zk.base)],
      [L('النصاب', 'Nissab'), money(Number(nisab) || 0)],
      [L('مقدار الزكاة 2.5%', 'Zakat 2,5%'), money(zk.due)],
    ];
    return [
      [L('إجمالي المبيعات', 'Total ventes'), money(totals.revenue)],
      [L('تكلفة البضاعة المباعة', 'Coût des ventes'), money(totals.cost)],
      [L('الربح المباشر', 'Marge brute'), money(totals.profit)],
      [L('نسبة الهامش', 'Taux de marge'), `${totals.margin.toFixed(1)}%`],
      [L('عدد الفواتير', 'Factures'), String(totals.count)],
    ];
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = rows.length && !['total', 'capital', 'zakat'].includes(report)
      ? rows.map(r => ({ [L('البيان', 'Libellé')]: r.label, [L('الكمية', 'Qté')]: r.qty, [L('المبيعات', 'Ventes')]: r.revenue, [L('التكلفة', 'Coût')]: r.cost, [L('الربح المباشر', 'Marge')]: r.profit, [L('الهامش %', 'Marge %')]: Number(r.margin.toFixed(1)) }))
      : summaryLines().map(([k, v]) => ({ [L('البيان', 'Libellé')]: k, [L('القيمة', 'Valeur')]: v }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Report');
    XLSX.writeFile(wb, `profit_${report}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const textReport = () => {
    let s = `📊 ${currentLabel} — ${periodLabel}\n\n` + summaryLines().map(([k, v]) => `• ${k}: ${v}`).join('\n');
    if (rows.length) s += '\n\n' + rows.slice(0, 15).map(r => `${r.label}: ${r.profit.toFixed(3)} (${r.margin.toFixed(1)}%)`).join('\n');
    return s;
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const table = rows.length && !['total', 'capital', 'zakat'].includes(report)
      ? `<table><tr><th>${L('البيان', 'Libellé')}</th><th>${L('الكمية', 'Qté')}</th><th>${L('المبيعات', 'Ventes')}</th><th>${L('التكلفة', 'Coût')}</th><th>${L('الربح', 'Marge')}</th><th>%</th></tr>${rows.map(r => `<tr><td>${r.label}</td><td>${r.qty}</td><td>${r.revenue.toFixed(3)}</td><td>${r.cost.toFixed(3)}</td><td>${r.profit.toFixed(3)}</td><td>${r.margin.toFixed(1)}</td></tr>`).join('')}</table>` : '';
    w.document.write(`<html dir="${dir}"><head><title>${currentLabel}</title><style>body{font-family:Cairo,Arial;padding:24px;color:#1e2a44}h1{border-bottom:3px solid #b8963e;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #ccc;padding:6px;text-align:start}th{background:#1e2a44;color:#fff}</style></head><body><h1>${currentLabel}</h1><p>${periodLabel} — ${format(new Date(), 'dd/MM/yyyy')}</p>${summaryLines().map(([k, v]) => `<p><b>${k}:</b> ${v}</p>`).join('')}${table}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };

  const showsPeriod = !['capital', 'zakat'].includes(report);

  return (
    <div className="space-y-3" dir={dir}>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {reports.map(r => (
          <Button key={r.key} size="sm" variant={report === r.key ? 'default' : 'outline'} className="shrink-0 rounded-full" onClick={() => setReport(r.key)}>{r.label}</Button>
        ))}
      </div>

      {showsPeriod && (
        <div className="flex gap-2 overflow-x-auto">
          {periods.map(p => (
            <Button key={p.key} size="sm" variant={period === p.key ? 'secondary' : 'ghost'} className="shrink-0" onClick={() => setPeriod(p.key)}>{p.label}</Button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={exportExcel}><FileSpreadsheet className="w-4 h-4 me-1" />Excel</Button>
        <Button size="sm" variant="outline" onClick={printReport}><Printer className="w-4 h-4 me-1" />PDF</Button>
        <Button size="sm" variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textReport())}`, '_blank')}><Share2 className="w-4 h-4 me-1" />WhatsApp</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {L('الربح المباشر = (سعر البيع − سعر الشراء) × الكمية', 'Marge directe = (prix de vente − prix d’achat) × quantité')}
      </p>
      {missingCost > 0 && (
        <p className="text-xs text-warning">{L(`⚠️ ${missingCost} منتج بدون سعر شراء — يُحسب ربحه كامل سعر البيع.`, `⚠️ ${missingCost} produit(s) sans prix d’achat — marge = prix de vente.`)}</p>
      )}

      {report === 'zakat' && (
        <Card><CardContent className="p-3 space-y-2">
          <label className="text-sm font-medium">{L('قيمة النصاب بالدينار (85 غ ذهب)', 'Nissab en TND (85 g d’or)')}</label>
          <Input type="number" inputMode="decimal" value={nisab} onChange={e => { setNisab(e.target.value); localStorage.setItem('zakat_nisab', e.target.value); }} placeholder="0.000" />
          <p className="text-xs text-muted-foreground">{L('أدخل قيمة 85 غرام ذهب بسعر اليوم. تجب الزكاة إذا بلغ الوعاء النصاب وحال عليه الحول.', 'Saisissez la valeur de 85 g d’or au cours du jour. Due si l’assiette atteint le nissab sur une année lunaire.')}</p>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        {summaryLines().map(([k, v], i, arr) => {
          const highlight = i === (report === 'zakat' ? arr.length - 1 : report === 'capital' ? 3 : 2);
          return (
            <Card key={k} className={cn(highlight && 'col-span-2 border-primary')}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className={cn('font-bold', highlight ? 'text-xl text-primary' : 'text-base')}>{v}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {report === 'zakat' && (
        <p className={cn('text-sm font-semibold', zk.reached ? 'text-success' : 'text-muted-foreground')}>
          {zk.reached ? L('✅ بلغ الوعاء النصاب', '✅ Nissab atteint') : L('لم يبلغ الوعاء النصاب (أو لم يُحدد النصاب)', 'Nissab non atteint (ou non défini)')}
        </p>
      )}

      {['product', 'invoice', 'customer', 'category'].includes(report) && (
        rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{L('لا توجد مبيعات في هذه الفترة', 'Aucune vente sur cette période')}</p>
        ) : (
          <div className="space-y-2">
            {rows.map(r => (
              <Card key={r.key}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {report === 'invoice' && r.extra ? format(new Date(r.extra), 'dd/MM HH:mm') + ' · ' : ''}
                        {L('الكمية', 'Qté')}: {r.qty} · {L('بيع', 'Vente')}: {r.revenue.toFixed(3)} · {L('تكلفة', 'Coût')}: {r.cost.toFixed(3)}
                      </p>
                      {report === 'customer' && r.extra && Number(r.extra) > 0 && (
                        <p className="text-xs text-destructive">{L('الدين الحالي', 'Dette')}: {Number(r.extra).toFixed(3)}</p>
                      )}
                    </div>
                    <div className="text-end shrink-0">
                      <p className={cn('font-bold', r.profit >= 0 ? 'text-success' : 'text-destructive')}>{r.profit.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground">{r.margin.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
