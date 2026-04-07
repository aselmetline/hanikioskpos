import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPaginated } from '@/lib/supabaseHelpers';
import { ProgressCallback } from './types';

export async function exportFullBackup(userId: string, onProgress?: ProgressCallback) {
  const workbook = XLSX.utils.book_new();
  const steps = 7;
  let step = 0;

  const report = (msg: string) => {
    step++;
    onProgress?.(Math.round((step / steps) * 100), msg);
  };

  // Products
  report('جاري تصدير المنتجات...');
  const { data: products } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('products').select('*').eq('user_id', userId).range(from, to)
  );
  if (products?.length) {
    const sheet = XLSX.utils.json_to_sheet(products.map(p => ({
      'الاسم بالعربية': p.name_ar, 'الاسم بالإنجليزية': p.name, 'السعر': p.price,
      'التكلفة': p.cost || 0, 'التصنيف': p.category, 'الباركود': p.barcode || '',
      'الكمية': p.stock, 'الوحدة': p.unit, 'تنبيه المخزون': p.low_stock_alert
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المنتجات');
  }

  // Customers
  report('جاري تصدير العملاء...');
  const { data: customers } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('customers').select('*').eq('user_id', userId).range(from, to)
  );
  if (customers?.length) {
    const sheet = XLSX.utils.json_to_sheet(customers.map(c => ({
      'الاسم': c.name, 'الهاتف': c.phone || '', 'النقاط': c.points,
      'رصيد الآجل': c.credit_balance, 'تاريخ الإضافة': c.created_at
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'العملاء');
  }

  // Sales + items
  report('جاري تصدير المبيعات...');
  const { data: sales } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('sales').select('*').eq('user_id', userId).range(from, to)
  );
  if (sales?.length) {
    const sheet = XLSX.utils.json_to_sheet(sales.map(s => ({
      'معرف البيع': s.id, 'التاريخ': s.created_at, 'المجموع الفرعي': s.subtotal,
      'الضريبة': s.tax, 'الخصم': s.discount, 'الإجمالي': s.total,
      'طريقة الدفع': s.payment_method === 'cash' ? 'نقدي' : 'آجل',
      'معرف العميل': s.customer_id || ''
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المبيعات');

    const saleIds = sales.map(s => String(s.id));
    const { data: saleItems } = await fetchAllPaginated<Record<string, unknown>>(
      (from, to) => supabase.from('sale_items').select('*').in('sale_id', saleIds).range(from, to)
    );
    if (saleItems?.length) {
      const itemSheet = XLSX.utils.json_to_sheet(saleItems.map(i => ({
        'معرف البيع': i.sale_id, 'المنتج': i.product_name, 'السعر': i.price,
        'الكمية': i.quantity, 'الخصم': i.discount, 'الإجمالي': i.total
      })));
      XLSX.utils.book_append_sheet(workbook, itemSheet, 'تفاصيل المبيعات');
    }
  }

  // Purchases + items
  report('جاري تصدير المشتريات...');
  const { data: purchases } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('purchases').select('*').eq('user_id', userId).range(from, to)
  );
  if (purchases?.length) {
    const sheet = XLSX.utils.json_to_sheet(purchases.map(p => ({
      'معرف الشراء': p.id, 'رقم الفاتورة': p.invoice_number,
      'تاريخ الفاتورة': p.invoice_date, 'الإجمالي': p.total,
      'معرف المورد': p.supplier_id || '', 'تاريخ الإنشاء': p.created_at
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المشتريات');

    const purchaseIds = purchases.map(p => String(p.id));
    const { data: purchaseItems } = await fetchAllPaginated<Record<string, unknown>>(
      (from, to) => supabase.from('purchase_items').select('*').in('purchase_id', purchaseIds).range(from, to)
    );
    if (purchaseItems?.length) {
      const itemSheet = XLSX.utils.json_to_sheet(purchaseItems.map(i => ({
        'معرف الشراء': i.purchase_id, 'المنتج': i.product_name,
        'التكلفة': i.cost, 'الكمية': i.quantity, 'الإجمالي': i.total
      })));
      XLSX.utils.book_append_sheet(workbook, itemSheet, 'تفاصيل المشتريات');
    }
  }

  // Suppliers
  report('جاري تصدير الموردين...');
  const { data: suppliers } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('suppliers').select('*').eq('user_id', userId).range(from, to)
  );
  if (suppliers?.length) {
    const sheet = XLSX.utils.json_to_sheet(suppliers.map(s => ({
      'الاسم': s.name, 'الهاتف': s.phone || '', 'العنوان': s.address || '',
      'ملاحظات': s.notes || '', 'رصيد الدين': s.debt_balance, 'تاريخ الإضافة': s.created_at
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'الموردين');
  }

  // Expenses
  report('جاري تصدير المصروفات...');
  const { data: expenses } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('expenses').select('*').eq('user_id', userId).range(from, to)
  );
  if (expenses?.length) {
    const sheet = XLSX.utils.json_to_sheet(expenses.map(e => ({
      'التاريخ': e.expense_date, 'المبلغ': e.amount,
      'التصنيف': e.category, 'الوصف': e.description || ''
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المصروفات');
  }

  // Cash box
  report('جاري تصدير الصندوق...');
  const { data: transactions } = await fetchAllPaginated<Record<string, unknown>>(
    (from, to) => supabase.from('cash_box_transactions').select('*').eq('user_id', userId).range(from, to)
  );
  if (transactions?.length) {
    const sheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
      'التاريخ': t.created_at, 'النوع': t.type === 'add' ? 'إيداع' : 'سحب',
      'المبلغ': t.amount, 'الوصف': t.description || '', 'التصنيف': t.category
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'الصندوق');
  }

  if (workbook.SheetNames.length === 0) {
    const sheet = XLSX.utils.json_to_sheet([{ 'ملاحظة': 'لا توجد بيانات للتصدير' }]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'فارغ');
  }

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `نسخة_احتياطية_${date}.xlsx`);
}
