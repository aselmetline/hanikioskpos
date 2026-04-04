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
