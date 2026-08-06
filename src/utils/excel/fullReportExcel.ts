import * as XLSX from 'xlsx';
import { Sale, Purchase, Expense, EXPENSE_CATEGORIES } from '@/types/pos';

interface FullReportInput {
  periodLabel: string;
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
}

/** Multi-sheet report export: summary, sales, top products, purchases, expenses. */
export function exportFullReport({ periodLabel, sales, purchases, expenses }: FullReportInput) {
  const totalSales = sales.reduce((s, x) => s + x.total, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((s, x) => s + x.total, 0);
  const creditSales = totalSales - cashSales;
  const totalTax = sales.reduce((s, x) => s + (x.tax || 0), 0);
  const totalPurchases = purchases.reduce((s, x) => s + x.total, 0);
  const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = totalSales - totalPurchases - totalExpenses;

  const wb = XLSX.utils.book_new();

  const summary = [
    { 'البند': 'الفترة', 'القيمة': periodLabel },
    { 'البند': 'عدد الفواتير', 'القيمة': sales.length },
    { 'البند': 'إجمالي المبيعات', 'القيمة': Number(totalSales.toFixed(3)) },
    { 'البند': 'مبيعات نقدية', 'القيمة': Number(cashSales.toFixed(3)) },
    { 'البند': 'مبيعات آجلة', 'القيمة': Number(creditSales.toFixed(3)) },
    { 'البند': 'إجمالي الأداء (TVA)', 'القيمة': Number(totalTax.toFixed(3)) },
    { 'البند': 'متوسط الفاتورة', 'القيمة': Number((sales.length ? totalSales / sales.length : 0).toFixed(3)) },
    { 'البند': 'إجمالي المشتريات', 'القيمة': Number(totalPurchases.toFixed(3)) },
    { 'البند': 'إجمالي المصروفات', 'القيمة': Number(totalExpenses.toFixed(3)) },
    { 'البند': 'صافي الربح', 'القيمة': Number(netProfit.toFixed(3)) },
    { 'البند': 'هامش الربح %', 'القيمة': Number((totalSales ? (netProfit / totalSales) * 100 : 0).toFixed(1)) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'الملخص');

  const salesRows = sales.map(s => ({
    'رقم الفاتورة': s.invoiceNumber ?? '',
    'التاريخ': new Date(s.createdAt).toLocaleDateString('fr-TN'),
    'الوقت': new Date(s.createdAt).toLocaleTimeString('fr-TN'),
    'عدد الأصناف': s.items.length,
    'المجموع الفرعي': Number(s.subtotal.toFixed(3)),
    'الخصم': Number(s.discount.toFixed(3)),
    'الأداء': Number(s.tax.toFixed(3)),
    'الطابع الجبائي': Number((s.fiscalStamp || 0).toFixed(3)),
    'الإجمالي': Number(s.total.toFixed(3)),
    'طريقة الدفع': s.paymentMethod === 'cash' ? 'نقدي' : 'آجل',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), 'المبيعات');

  const prodMap = new Map<string, { name: string; qty: number; total: number }>();
  sales.forEach(s => s.items.forEach(it => {
    const key = it.product.id || it.product.name;
    const cur = prodMap.get(key) || { name: it.product.nameAr || it.product.name, qty: 0, total: 0 };
    cur.qty += it.quantity;
    cur.total += it.product.price * it.quantity - it.discount;
    prodMap.set(key, cur);
  }));
  const topRows = [...prodMap.values()].sort((a, b) => b.total - a.total).map(p => ({
    'المنتج': p.name,
    'الكمية المباعة': p.qty,
    'إجمالي المبيعات': Number(p.total.toFixed(3)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), 'أفضل المنتجات');

  const purchaseRows = purchases.map(p => ({
    'رقم الفاتورة': p.invoiceNumber,
    'التاريخ': new Date(p.invoiceDate).toLocaleDateString('fr-TN'),
    'المورد': p.supplierName || '',
    'عدد الأصناف': p.items.length,
    'الإجمالي': Number(p.total.toFixed(3)),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(purchaseRows), 'المشتريات');

  const catLabels = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.id, c.label]));
  const expenseRows = expenses.map(e => ({
    'التاريخ': new Date(e.date).toLocaleDateString('fr-TN'),
    'التصنيف': catLabels[e.category] || e.category,
    'المبلغ': Number(e.amount.toFixed(3)),
    'الوصف': e.description || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), 'المصروفات');

  XLSX.writeFile(wb, `rapport_complet_${new Date().toISOString().split('T')[0]}.xlsx`);
}
