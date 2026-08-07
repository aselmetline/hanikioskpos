import { Sale, Purchase, Expense, EXPENSE_CATEGORIES } from '@/types/pos';
import { exportElementToA4PDF } from '@/utils/pdfPaginate';

export interface FullReportPdfInput {
  periodLabel: string;
  rangeLabel: string;
  storeName?: string;
  language: 'ar' | 'fr';
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
}

const L = {
  ar: {
    dir: 'rtl', title: 'التقرير الكامل', period: 'الفترة', generated: 'تاريخ الإصدار',
    summary: 'الملخص العام', sales: 'المبيعات', topProducts: 'أفضل المنتجات',
    purchases: 'المشتريات', expenses: 'المصروفات', vat: 'توزيع الأداء (TVA)',
    invoicesCount: 'عدد الفواتير', totalSales: 'إجمالي المبيعات', cash: 'مبيعات نقدية',
    credit: 'مبيعات آجلة', tva: 'إجمالي الأداء (TVA)', avg: 'متوسط الفاتورة',
    totalPurchases: 'إجمالي المشتريات', totalExpenses: 'إجمالي المصروفات',
    netProfit: 'صافي الربح', margin: 'هامش الربح',
    invoice: 'رقم الفاتورة', date: 'التاريخ', time: 'الوقت', items: 'الأصناف',
    subtotal: 'المجموع الفرعي', discount: 'الخصم', tax: 'الأداء', stamp: 'الطابع',
    total: 'الإجمالي', payment: 'الدفع', product: 'المنتج', qty: 'الكمية',
    supplier: 'المورد', category: 'التصنيف', amount: 'المبلغ', description: 'الوصف',
    rate: 'النسبة', base: 'الأساس HT', none: 'لا توجد بيانات', page: 'تقرير آلي — نقطة بيع هاني',
  },
  fr: {
    dir: 'ltr', title: 'Rapport complet', period: 'Période', generated: 'Date d\'édition',
    summary: 'Résumé général', sales: 'Ventes', topProducts: 'Meilleurs produits',
    purchases: 'Achats', expenses: 'Dépenses', vat: 'Répartition TVA',
    invoicesCount: 'Nombre de factures', totalSales: 'Total des ventes', cash: 'Ventes espèces',
    credit: 'Ventes à crédit', tva: 'Total TVA', avg: 'Panier moyen',
    totalPurchases: 'Total des achats', totalExpenses: 'Total des dépenses',
    netProfit: 'Bénéfice net', margin: 'Marge',
    invoice: 'N° facture', date: 'Date', time: 'Heure', items: 'Articles',
    subtotal: 'Sous-total', discount: 'Remise', tax: 'TVA', stamp: 'Timbre',
    total: 'Total', payment: 'Paiement', product: 'Produit', qty: 'Qté',
    supplier: 'Fournisseur', category: 'Catégorie', amount: 'Montant', description: 'Description',
    rate: 'Taux', base: 'Base HT', none: 'Aucune donnée', page: 'Rapport automatique — Hani POS',
  },
} as const;

const n = (v: number) => v.toFixed(3);

function table(headers: string[], rows: string[][], emptyLabel: string) {
  if (rows.length === 0) {
    return `<p style="padding:10px 0;color:#8a8a8a;font-size:12px">${emptyLabel}</p>`;
  }
  return `<table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr>${headers
      .map(h => `<th style="background:#0F2547;color:#fff;padding:7px 6px;text-align:start;font-weight:600;border:1px solid #0F2547">${h}</th>`)
      .join('')}</tr></thead>
    <tbody>${rows
      .map((r, i) => `<tr style="background:${i % 2 ? '#F4F6FA' : '#fff'}">${r
        .map(cell => `<td style="padding:6px;border:1px solid #DCE1EA;white-space:nowrap">${cell}</td>`)
        .join('')}</tr>`)
      .join('')}</tbody></table>`;
}

function section(title: string, body: string) {
  return `<section style="margin-top:22px;break-inside:avoid">
    <h2 style="font-size:14px;margin:0 0 8px;color:#0F2547;border-bottom:2px solid #C9A227;padding-bottom:5px;letter-spacing:.3px">${title}</h2>
    ${body}
  </section>`;
}

function buildHtml(input: FullReportPdfInput) {
  const { sales, purchases, expenses, language } = input;
  const l = L[language];

  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
  const creditSales = totalSales - cashSales;
  const totalTax = sales.reduce((s, x) => s + (x.tax || 0), 0);
  const totalPurchases = purchases.reduce((s, x) => s + x.total, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;
  const margin = totalSales ? (netProfit / totalSales) * 100 : 0;

  const kpi = (label: string, value: string, accent?: string) => `
    <div style="border:1px solid #DCE1EA;border-radius:8px;padding:8px 10px;background:#fff">
      <div style="font-size:10px;color:#7A8598">${label}</div>
      <div style="font-size:14px;font-weight:700;color:${accent || '#0F2547'}">${value}</div>
    </div>`;

  const summary = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
    ${kpi(l.invoicesCount, String(sales.length))}
    ${kpi(l.totalSales, n(totalSales))}
    ${kpi(l.avg, n(sales.length ? totalSales / sales.length : 0))}
    ${kpi(l.cash, n(cashSales))}
    ${kpi(l.credit, n(creditSales))}
    ${kpi(l.tva, n(totalTax))}
    ${kpi(l.totalPurchases, n(totalPurchases))}
    ${kpi(l.totalExpenses, n(totalExpenses))}
    ${kpi(l.netProfit, n(netProfit), netProfit >= 0 ? '#137A4A' : '#B3261E')}
    ${kpi(l.margin, `${margin.toFixed(1)}%`, netProfit >= 0 ? '#137A4A' : '#B3261E')}
  </div>`;

  const salesRows = sales.map(s => [
    String(s.invoiceNumber ?? '-'),
    new Date(s.createdAt).toLocaleDateString('fr-TN'),
    new Date(s.createdAt).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' }),
    String(s.items.length),
    n(s.subtotal),
    n(s.discount),
    n(s.tax),
    n(s.fiscalStamp || 0),
    `<b>${n(s.total)}</b>`,
    s.paymentMethod === 'cash' ? l.cash : l.credit,
  ]);

  const prodMap = new Map<string, { name: string; qty: number; total: number }>();
  sales.forEach(s => s.items.forEach(it => {
    const key = it.product.id || it.product.name;
    const cur = prodMap.get(key) || {
      name: (language === 'ar' ? it.product.nameAr : it.product.name) || it.product.name,
      qty: 0, total: 0,
    };
    cur.qty += it.quantity;
    cur.total += it.product.price * it.quantity - it.discount;
    prodMap.set(key, cur);
  }));
  const topRows = [...prodMap.values()]
    .sort((a, b) => b.total - a.total)
    .map(p => [p.name, String(p.qty), n(p.total)]);

  const purchaseRows = purchases.map(p => [
    p.invoiceNumber,
    new Date(p.invoiceDate).toLocaleDateString('fr-TN'),
    p.supplierName || '-',
    String(p.items.length),
    n(p.total),
  ]);

  const catLabels = Object.fromEntries(
    EXPENSE_CATEGORIES.map(c => [c.id, language === 'ar' ? c.label : c.labelFr])
  );
  const expenseRows = expenses.map(e => [
    new Date(e.date).toLocaleDateString('fr-TN'),
    catLabels[e.category] || e.category,
    n(e.amount),
    e.description || '-',
  ]);

  const vatMap = new Map<string, { base: number; tax: number }>();
  sales.forEach(s => Object.entries(s.taxBreakdown || {}).forEach(([rate, v]) => {
    const cur = vatMap.get(rate) || { base: 0, tax: 0 };
    cur.base += Number(v?.base) || 0;
    cur.tax += Number(v?.tax) || 0;
    vatMap.set(rate, cur);
  }));
  const vatRows = [...vatMap.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([rate, v]) => [`${(Number(rate) * 100).toFixed(0)}%`, n(v.base), n(v.tax), n(v.base + v.tax)]);

  return `<div dir="${l.dir}" style="width:794px;padding:32px 34px;background:#FAFAF7;font-family:Cairo,system-ui,sans-serif;color:#1B2432;box-sizing:border-box">
    <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0F2547;padding-bottom:14px">
      <div>
        <h1 style="margin:0;font-size:22px;color:#0F2547;letter-spacing:.5px">${input.storeName || 'Hani Kiosk POS'}</h1>
        <p style="margin:4px 0 0;font-size:13px;color:#C9A227;font-weight:700">${l.title}</p>
      </div>
      <div style="text-align:end;font-size:11px;color:#5A6478;line-height:1.7">
        <div><b>${l.period}:</b> ${input.periodLabel}</div>
        <div>${input.rangeLabel}</div>
        <div><b>${l.generated}:</b> ${new Date().toLocaleString('fr-TN')}</div>
      </div>
    </header>

    ${section(l.summary, summary)}
    ${section(l.sales, table([l.invoice, l.date, l.time, l.items, l.subtotal, l.discount, l.tax, l.stamp, l.total, l.payment], salesRows, l.none))}
    ${section(l.topProducts, table([l.product, l.qty, l.total], topRows, l.none))}
    ${section(l.vat, table([l.rate, l.base, l.tax, l.total], vatRows, l.none))}
    ${section(l.purchases, table([l.invoice, l.date, l.supplier, l.items, l.total], purchaseRows, l.none))}
    ${section(l.expenses, table([l.date, l.category, l.amount, l.description], expenseRows, l.none))}

    <footer style="margin-top:26px;border-top:1px solid #DCE1EA;padding-top:8px;text-align:center;font-size:10px;color:#8A93A5">
      ${l.page}
    </footer>
  </div>`;
}

async function render(input: FullReportPdfInput, fileName: string, returnBlob: boolean) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1';
  host.innerHTML = buildHtml(input);
  document.body.appendChild(host);
  try {
    return await exportElementToA4PDF(host.firstElementChild as HTMLElement, fileName, {
      background: '#FAFAF7',
      scale: 2,
      returnBlob,
    });
  } finally {
    host.remove();
  }
}

export function reportFileName(periodLabel: string) {
  const safe = periodLabel.replace(/[^\p{L}\p{N}]+/gu, '-');
  return `rapport_complet_${safe}_${new Date().toISOString().split('T')[0]}.pdf`;
}

/** Download the full multi-section report as an A4 PDF. */
export async function exportFullReportPdf(input: FullReportPdfInput) {
  await render(input, reportFileName(input.periodLabel), false);
}

/** Build the PDF and share it through WhatsApp (native share sheet when available). */
export async function shareFullReportPdf(input: FullReportPdfInput, message: string) {
  const fileName = reportFileName(input.periodLabel);
  const blob = (await render(input, fileName, true)) as Blob;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text: message });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  return 'downloaded';
}
