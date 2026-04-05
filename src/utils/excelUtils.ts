import * as XLSX from 'xlsx';
import { Product } from '@/types/pos';
import { supabase } from '@/integrations/supabase/client';

export interface ExcelProduct {
  name: string;
  nameAr: string;
  price: number;
  cost?: number;
  category: string;
  barcode?: string;
  stock: number;
  unit: string;
  lowStockAlert: number;
}

export function exportProductsToExcel(products: Product[], filename: string = 'products') {
  const data = products.map(p => ({
    'الاسم بالعربية': p.nameAr,
    'الاسم بالإنجليزية': p.name,
    'السعر': p.price,
    'التكلفة': p.cost || 0,
    'التصنيف': p.category,
    'الباركود': p.barcode || '',
    'الكمية': p.stock,
    'الوحدة': p.unit,
    'تنبيه المخزون': p.lowStockAlert
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المنتجات');

  // Auto-size columns
  const maxWidth = 20;
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.min(maxWidth, Math.max(key.length, ...data.map(row => String(row[key as keyof typeof row]).length)))
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function parseExcelProducts(file: File): Promise<ExcelProduct[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const products: ExcelProduct[] = jsonData.map((row: any) => ({
          name: row['الاسم بالإنجليزية'] || row['name'] || row['Name'] || '',
          nameAr: row['الاسم بالعربية'] || row['nameAr'] || row['NameAr'] || '',
          price: parseFloat(row['السعر'] || row['price'] || row['Price'] || 0),
          cost: parseFloat(row['التكلفة'] || row['cost'] || row['Cost'] || 0),
          category: row['التصنيف'] || row['category'] || row['Category'] || 'daily',
          barcode: row['الباركود'] || row['barcode'] || row['Barcode'] || '',
          stock: parseInt(row['الكمية'] || row['stock'] || row['Stock'] || 0),
          unit: row['الوحدة'] || row['unit'] || row['Unit'] || 'قطعة',
          lowStockAlert: parseInt(row['تنبيه المخزون'] || row['lowStockAlert'] || row['LowStockAlert'] || 10)
        }));

        resolve(products.filter(p => p.nameAr || p.name));
      } catch (error) {
        reject(new Error('فشل في قراءة الملف'));
      }
    };

    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportSalesReport(sales: any[], filename: string = 'sales_report') {
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

export function exportExpensesReport(expenses: any[], filename: string = 'expenses_report') {
  const categoryLabels: Record<string, string> = {
    electricity: 'كهرباء',
    rent: 'إيجار',
    salaries: 'رواتب',
    supplies: 'لوازم',
    maintenance: 'صيانة',
    transport: 'نقل',
    other: 'أخرى'
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

export function downloadSampleTemplate() {
  const sampleData = [
    {
      'الاسم بالعربية': 'منتج عينة',
      'الاسم بالإنجليزية': 'Sample Product',
      'السعر': 10.000,
      'التكلفة': 8.000,
      'التصنيف': 'daily',
      'الباركود': '1234567890123',
      'الكمية': 100,
      'الوحدة': 'قطعة',
      'تنبيه المخزون': 10
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المنتجات');
  
  XLSX.writeFile(workbook, 'products_template.xlsx');
}

export async function importFullBackup(file: File, userId: string): Promise<{ imported: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const imported: string[] = [];

        // Products
        if (workbook.SheetNames.includes('المنتجات')) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets['المنتجات']);
          if (rows.length) {
            const products = (rows as any[]).map(r => ({
              user_id: userId,
              name: r['الاسم بالإنجليزية'] || '',
              name_ar: r['الاسم بالعربية'] || '',
              price: parseFloat(r['السعر'] || 0),
              cost: parseFloat(r['التكلفة'] || 0),
              category: r['التصنيف'] || 'daily',
              barcode: r['الباركود'] || null,
              stock: parseInt(r['الكمية'] || 0),
              unit: r['الوحدة'] || 'قطعة',
              low_stock_alert: parseInt(r['تنبيه المخزون'] || 10),
            }));
            const { error } = await supabase.from('products').insert(products);
            if (!error) imported.push(`المنتجات (${products.length})`);
          }
        }

        // Customers
        if (workbook.SheetNames.includes('العملاء')) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets['العملاء']);
          if (rows.length) {
            const customers = (rows as any[]).map(r => ({
              user_id: userId,
              name: r['الاسم'] || '',
              phone: r['الهاتف'] || null,
              points: parseInt(r['النقاط'] || 0),
              credit_balance: parseFloat(r['رصيد الآجل'] || 0),
            }));
            const { error } = await supabase.from('customers').insert(customers);
            if (!error) imported.push(`العملاء (${customers.length})`);
          }
        }

        // Expenses
        if (workbook.SheetNames.includes('المصروفات')) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets['المصروفات']);
          if (rows.length) {
            const expenses = (rows as any[]).map(r => ({
              user_id: userId,
              expense_date: r['التاريخ'] || new Date().toISOString().split('T')[0],
              amount: parseFloat(r['المبلغ'] || 0),
              category: r['التصنيف'] || 'other',
              description: r['الوصف'] || null,
            }));
            const { error } = await supabase.from('expenses').insert(expenses);
            if (!error) imported.push(`المصروفات (${expenses.length})`);
          }
        }

        // Cash box transactions
        if (workbook.SheetNames.includes('الصندوق')) {
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets['الصندوق']);
          if (rows.length) {
            const transactions = (rows as any[]).map(r => ({
              user_id: userId,
              type: r['النوع'] === 'إيداع' ? 'add' : 'deduct',
              amount: parseFloat(r['المبلغ'] || 0),
              description: r['الوصف'] || null,
              category: r['التصنيف'] || 'manual',
            }));
            const { error } = await supabase.from('cash_box_transactions').insert(transactions);
            if (!error) imported.push(`الصندوق (${transactions.length})`);
          }
        }

        resolve({ imported });
      } catch (error) {
        reject(new Error('فشل في قراءة ملف النسخة الاحتياطية'));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

export async function exportFullBackup(userId: string) {
  const workbook = XLSX.utils.book_new();

  // Products
  const { data: products } = await supabase.from('products').select('*').eq('user_id', userId);
  if (products?.length) {
    const sheet = XLSX.utils.json_to_sheet(products.map(p => ({
      'الاسم بالعربية': p.name_ar, 'الاسم بالإنجليزية': p.name, 'السعر': p.price,
      'التكلفة': p.cost || 0, 'التصنيف': p.category, 'الباركود': p.barcode || '',
      'الكمية': p.stock, 'الوحدة': p.unit, 'تنبيه المخزون': p.low_stock_alert
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المنتجات');
  }

  // Customers
  const { data: customers } = await supabase.from('customers').select('*').eq('user_id', userId);
  if (customers?.length) {
    const sheet = XLSX.utils.json_to_sheet(customers.map(c => ({
      'الاسم': c.name, 'الهاتف': c.phone || '', 'النقاط': c.points,
      'رصيد الآجل': c.credit_balance, 'تاريخ الإضافة': c.created_at
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'العملاء');
  }

  // Sales with items
  const { data: sales } = await supabase.from('sales').select('*').eq('user_id', userId);
  if (sales?.length) {
    const sheet = XLSX.utils.json_to_sheet(sales.map(s => ({
      'التاريخ': s.created_at, 'المجموع الفرعي': s.subtotal, 'الضريبة': s.tax,
      'الخصم': s.discount, 'الإجمالي': s.total,
      'طريقة الدفع': s.payment_method === 'cash' ? 'نقدي' : 'آجل',
      'معرف العميل': s.customer_id || ''
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المبيعات');

    const saleIds = sales.map(s => s.id);
    const { data: saleItems } = await supabase.from('sale_items').select('*').in('sale_id', saleIds);
    if (saleItems?.length) {
      const itemSheet = XLSX.utils.json_to_sheet(saleItems.map(i => ({
        'معرف البيع': i.sale_id, 'المنتج': i.product_name, 'السعر': i.price,
        'الكمية': i.quantity, 'الخصم': i.discount, 'الإجمالي': i.total
      })));
      XLSX.utils.book_append_sheet(workbook, itemSheet, 'تفاصيل المبيعات');
    }
  }

  // Purchases with items
  const { data: purchases } = await supabase.from('purchases').select('*').eq('user_id', userId);
  if (purchases?.length) {
    const sheet = XLSX.utils.json_to_sheet(purchases.map(p => ({
      'رقم الفاتورة': p.invoice_number, 'تاريخ الفاتورة': p.invoice_date,
      'الإجمالي': p.total, 'تاريخ الإنشاء': p.created_at
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المشتريات');

    const purchaseIds = purchases.map(p => p.id);
    const { data: purchaseItems } = await supabase.from('purchase_items').select('*').in('purchase_id', purchaseIds);
    if (purchaseItems?.length) {
      const itemSheet = XLSX.utils.json_to_sheet(purchaseItems.map(i => ({
        'معرف الشراء': i.purchase_id, 'المنتج': i.product_name,
        'التكلفة': i.cost, 'الكمية': i.quantity, 'الإجمالي': i.total
      })));
      XLSX.utils.book_append_sheet(workbook, itemSheet, 'تفاصيل المشتريات');
    }
  }

  // Expenses
  const { data: expenses } = await supabase.from('expenses').select('*').eq('user_id', userId);
  if (expenses?.length) {
    const sheet = XLSX.utils.json_to_sheet(expenses.map(e => ({
      'التاريخ': e.expense_date, 'المبلغ': e.amount,
      'التصنيف': e.category, 'الوصف': e.description || ''
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'المصروفات');
  }

  // Cash box transactions
  const { data: transactions } = await supabase.from('cash_box_transactions').select('*').eq('user_id', userId);
  if (transactions?.length) {
    const sheet = XLSX.utils.json_to_sheet(transactions.map(t => ({
      'التاريخ': t.created_at, 'النوع': t.type === 'add' ? 'إيداع' : 'سحب',
      'المبلغ': t.amount, 'الوصف': t.description || '', 'التصنيف': t.category
    })));
    XLSX.utils.book_append_sheet(workbook, sheet, 'الصندوق');
  }

  // If workbook is empty, add a placeholder
  if (workbook.SheetNames.length === 0) {
    const sheet = XLSX.utils.json_to_sheet([{ 'ملاحظة': 'لا توجد بيانات للتصدير' }]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'فارغ');
  }

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `نسخة_احتياطية_${date}.xlsx`);
}
