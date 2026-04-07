import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { ProgressCallback } from './types';

export async function importFullBackup(
  file: File,
  userId: string,
  onProgress?: ProgressCallback
): Promise<{ imported: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const imported: string[] = [];
        const totalSheets = workbook.SheetNames.length;
        let processed = 0;

        const report = (msg: string) => {
          processed++;
          onProgress?.(Math.round((processed / Math.max(totalSheets, 1)) * 100), msg);
        };

        // Products
        if (workbook.SheetNames.includes('المنتجات')) {
          report('جاري استيراد المنتجات...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['المنتجات']);
          if (rows.length) {
            const products = rows.map(r => ({
              user_id: userId,
              name: String(r['الاسم بالإنجليزية'] || ''),
              name_ar: String(r['الاسم بالعربية'] || ''),
              price: parseFloat(String(r['السعر'] || 0)),
              cost: parseFloat(String(r['التكلفة'] || 0)),
              category: String(r['التصنيف'] || 'daily'),
              barcode: r['الباركود'] ? String(r['الباركود']) : null,
              stock: parseInt(String(r['الكمية'] || 0)),
              unit: String(r['الوحدة'] || 'قطعة'),
              low_stock_alert: parseInt(String(r['تنبيه المخزون'] || 10)),
            }));
            const { error } = await supabase.from('products').insert(products);
            if (!error) imported.push(`المنتجات (${products.length})`);
          }
        }

        // Customers
        if (workbook.SheetNames.includes('العملاء')) {
          report('جاري استيراد العملاء...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['العملاء']);
          if (rows.length) {
            const customers = rows.map(r => ({
              user_id: userId,
              name: String(r['الاسم'] || ''),
              phone: r['الهاتف'] ? String(r['الهاتف']) : null,
              points: parseInt(String(r['النقاط'] || 0)),
              credit_balance: parseFloat(String(r['رصيد الآجل'] || 0)),
            }));
            const { error } = await supabase.from('customers').insert(customers);
            if (!error) imported.push(`العملاء (${customers.length})`);
          }
        }

        // Sales + Sale Items
        if (workbook.SheetNames.includes('المبيعات')) {
          report('جاري استيراد المبيعات...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['المبيعات']);
          if (rows.length) {
            for (const r of rows) {
              const { data: saleData, error: saleError } = await supabase.from('sales').insert({
                user_id: userId,
                subtotal: parseFloat(String(r['المجموع الفرعي'] || 0)),
                tax: parseFloat(String(r['الضريبة'] || 0)),
                discount: parseFloat(String(r['الخصم'] || 0)),
                total: parseFloat(String(r['الإجمالي'] || 0)),
                payment_method: r['طريقة الدفع'] === 'نقدي' ? 'cash' : 'credit',
                customer_id: r['معرف العميل'] ? String(r['معرف العميل']) : null,
                created_at: r['التاريخ'] ? String(r['التاريخ']) : new Date().toISOString(),
              }).select('id').single();

              if (!saleError && saleData && workbook.SheetNames.includes('تفاصيل المبيعات')) {
                const itemRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['تفاصيل المبيعات']);
                const originalSaleId = r['معرف البيع'] ? String(r['معرف البيع']) : null;
                if (originalSaleId) {
                  const matchingItems = itemRows.filter(i => String(i['معرف البيع']) === originalSaleId);
                  if (matchingItems.length) {
                    const items = matchingItems.map(i => ({
                      sale_id: saleData.id,
                      product_name: String(i['المنتج'] || ''),
                      price: parseFloat(String(i['السعر'] || 0)),
                      quantity: parseInt(String(i['الكمية'] || 1)),
                      discount: parseFloat(String(i['الخصم'] || 0)),
                      total: parseFloat(String(i['الإجمالي'] || 0)),
                    }));
                    await supabase.from('sale_items').insert(items);
                  }
                }
              }
            }
            imported.push(`المبيعات (${rows.length})`);
          }
        }

        // Purchases + Purchase Items
        if (workbook.SheetNames.includes('المشتريات')) {
          report('جاري استيراد المشتريات...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['المشتريات']);
          if (rows.length) {
            for (const r of rows) {
              const { data: purchaseData, error: purchaseError } = await supabase.from('purchases').insert({
                user_id: userId,
                invoice_number: String(r['رقم الفاتورة'] || ''),
                invoice_date: r['تاريخ الفاتورة'] ? String(r['تاريخ الفاتورة']) : new Date().toISOString().split('T')[0],
                total: parseFloat(String(r['الإجمالي'] || 0)),
                created_at: r['تاريخ الإنشاء'] ? String(r['تاريخ الإنشاء']) : new Date().toISOString(),
              }).select('id').single();

              if (!purchaseError && purchaseData && workbook.SheetNames.includes('تفاصيل المشتريات')) {
                const itemRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['تفاصيل المشتريات']);
                const originalPurchaseId = r['معرف الشراء'] ? String(r['معرف الشراء']) : null;
                if (originalPurchaseId) {
                  const matchingItems = itemRows.filter(i => String(i['معرف الشراء']) === originalPurchaseId);
                  if (matchingItems.length) {
                    const items = matchingItems.map(i => ({
                      purchase_id: purchaseData.id,
                      product_name: String(i['المنتج'] || ''),
                      cost: parseFloat(String(i['التكلفة'] || 0)),
                      quantity: parseInt(String(i['الكمية'] || 1)),
                      total: parseFloat(String(i['الإجمالي'] || 0)),
                    }));
                    await supabase.from('purchase_items').insert(items);
                  }
                }
              }
            }
            imported.push(`المشتريات (${rows.length})`);
          }
        }

        // Expenses
        if (workbook.SheetNames.includes('المصروفات')) {
          report('جاري استيراد المصروفات...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['المصروفات']);
          if (rows.length) {
            const expenses = rows.map(r => ({
              user_id: userId,
              expense_date: r['التاريخ'] ? String(r['التاريخ']) : new Date().toISOString().split('T')[0],
              amount: parseFloat(String(r['المبلغ'] || 0)),
              category: String(r['التصنيف'] || 'other'),
              description: r['الوصف'] ? String(r['الوصف']) : null,
            }));
            const { error } = await supabase.from('expenses').insert(expenses);
            if (!error) imported.push(`المصروفات (${expenses.length})`);
          }
        }

        // Cash box
        if (workbook.SheetNames.includes('الصندوق')) {
          report('جاري استيراد الصندوق...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['الصندوق']);
          if (rows.length) {
            const transactions = rows.map(r => ({
              user_id: userId,
              type: r['النوع'] === 'إيداع' ? 'add' : 'deduct',
              amount: parseFloat(String(r['المبلغ'] || 0)),
              description: r['الوصف'] ? String(r['الوصف']) : null,
              category: String(r['التصنيف'] || 'manual'),
            }));
            const { error } = await supabase.from('cash_box_transactions').insert(transactions);
            if (!error) imported.push(`الصندوق (${transactions.length})`);
          }
        }

        // Suppliers
        if (workbook.SheetNames.includes('الموردين')) {
          report('جاري استيراد الموردين...');
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['الموردين']);
          if (rows.length) {
            const suppliersData = rows.map(r => ({
              user_id: userId,
              name: String(r['الاسم'] || ''),
              phone: r['الهاتف'] ? String(r['الهاتف']) : null,
              address: r['العنوان'] ? String(r['العنوان']) : null,
              notes: r['ملاحظات'] ? String(r['ملاحظات']) : null,
              debt_balance: parseFloat(String(r['رصيد الدين'] || 0)),
            }));
            const { error } = await supabase.from('suppliers').insert(suppliersData);
            if (!error) imported.push(`الموردين (${suppliersData.length})`);
          }
        }

        resolve({ imported });
      } catch {
        reject(new Error('فشل في قراءة ملف النسخة الاحتياطية'));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}
