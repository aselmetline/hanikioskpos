import * as XLSX from 'xlsx';

export function exportSalesReport(sales: { createdAt: Date; items: unknown[]; subtotal: number; tax: number; discount: number; total: number; paymentMethod: string }[], filename: string = 'sales_report') {
  const data = sales.map(s => ({
    'التاريخ': new Date(s.createdAt).toLocaleDateString('ar-TN'),
    'الوقت': new Date(s.createdAt).toLocaleTimeString('ar-TN'),
    'عدد المنتجات': s.items.length,
    'المجموع الفرعي': s.subtotal,
    'الضريبة': s.tax,
    'الخصم': s.discount,
    'الإجمالي': s.total,
    'طريقة الدفع': s.paymentMethod === 'cash' ? 'نقدي' : 'آجل'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المبيعات');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportExpensesReport(expenses: { date: Date; amount: number; category: string; description: string }[], filename: string = 'expenses_report') {
  const categoryLabels: Record<string, string> = {
    electricity: 'كهرباء', rent: 'إيجار', salaries: 'رواتب',
    supplies: 'لوازم', maintenance: 'صيانة', transport: 'نقل', other: 'أخرى'
  };

  const data = expenses.map(e => ({
    'التاريخ': new Date(e.date).toLocaleDateString('ar-TN'),
    'المبلغ': e.amount,
    'التصنيف': categoryLabels[e.category] || e.category,
    'الوصف': e.description || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المصروفات');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
