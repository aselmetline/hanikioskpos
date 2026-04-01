import { Printer, X, Check, Share2, Download } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'credit';
  customer?: Customer;
  kioskName?: string;
  kioskNameFr?: string;
  saleId?: string;
  taxEnabled?: boolean;
  taxRate?: number;
}

function generateInvoiceNumber(saleId?: string): string {
  if (!saleId) return '---';
  const datePart = format(new Date(), 'yyyyMMdd');
  const shortId = saleId.substring(0, 6).toUpperCase();
  return `INV-${datePart}-${shortId}`;
}

export function ReceiptPrinter({
  open,
  onOpenChange,
  items,
  subtotal,
  tax,
  discount,
  total,
  paymentMethod,
  customer,
  kioskName = 'كشك هاني',
  kioskNameFr = 'Hani Kiosk',
  saleId,
  taxEnabled = true,
  taxRate = 0.19
}: ReceiptPrinterProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const invoiceNumber = generateInvoiceNumber(saleId);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>إيصال - ${invoiceNumber}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                width: 58mm; 
                padding: 5mm;
                direction: rtl;
              }
              .header { text-align: center; margin-bottom: 10px; }
              .header h1 { font-size: 16px; margin-bottom: 2px; }
              .header p { font-size: 10px; color: #666; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .item { display: flex; justify-content: space-between; margin: 4px 0; }
              .item-name { flex: 1; }
              .item-qty { width: 30px; text-align: center; }
              .item-price { width: 50px; text-align: left; }
              .totals { margin-top: 10px; }
              .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
              .grand-total { font-size: 14px; font-weight: bold; }
              .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
              .invoice-number { font-size: 11px; font-weight: bold; margin-top: 4px; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
            <script>window.print(); window.close();</script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleExportPDF = useCallback(async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 80; // 80mm receipt width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight + 10],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 5, imgWidth, imgHeight);
      pdf.save(`فاتورة-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [invoiceNumber]);

  const handleShare = async () => {
    const receiptText = `
${kioskName}
${kioskNameFr}
رقم الفاتورة: ${invoiceNumber}
${format(now, 'dd/MM/yyyy HH:mm')}
${'─'.repeat(20)}
${items.map(item => `${item.product.nameAr} x${item.quantity} = ${(item.product.price * item.quantity).toFixed(3)}`).join('\n')}
${'─'.repeat(20)}
المجموع الفرعي: ${subtotal.toFixed(3)} ${CURRENCY}
${discount > 0 ? `الخصم: -${discount.toFixed(3)} ${CURRENCY}\n` : ''}الضريبة (19%): ${tax.toFixed(3)} ${CURRENCY}
${'─'.repeat(20)}
الإجمالي: ${total.toFixed(3)} ${CURRENCY}
طريقة الدفع: ${paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
${customer ? `العميل: ${customer.name}` : ''}
${'─'.repeat(20)}
شكراً لتعاملكم معنا!
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `إيصال ${invoiceNumber}`,
          text: receiptText
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            معاينة الإيصال
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div 
          ref={receiptRef}
          className="bg-white text-black rounded-xl shadow-lg overflow-hidden text-sm"
          style={{ direction: 'rtl', fontFamily: "'Cairo', 'Courier New', monospace" }}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-l from-emerald-600 to-blue-600 text-white px-5 py-4 text-center">
            <h1 className="text-xl font-bold tracking-wide">{kioskName}</h1>
            <p className="text-emerald-100 text-xs mt-0.5">{kioskNameFr}</p>
          </div>

          <div className="px-5 py-3">
            {/* Invoice info */}
            <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <div>
                <p className="text-[10px] text-gray-400">رقم الفاتورة</p>
                <p className="text-xs font-bold text-gray-800">{invoiceNumber}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-400">التاريخ</p>
                <p className="text-xs font-bold text-gray-800">{format(now, 'dd/MM/yyyy')}</p>
                <p className="text-[10px] text-gray-500">{format(now, 'HH:mm', { locale: ar })}</p>
              </div>
            </div>

            {/* Items header */}
            <div className="flex justify-between text-[10px] text-gray-400 font-bold border-b border-gray-200 pb-1 mb-1">
              <span className="flex-1">المنتج</span>
              <span className="w-8 text-center">الكمية</span>
              <span className="w-16 text-left">السعر</span>
            </div>

            {/* Items */}
            <div className="space-y-1.5 mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs items-center">
                  <span className="flex-1 truncate font-medium text-gray-800">{item.product.nameAr}</span>
                  <span className="w-8 text-center text-gray-500 bg-gray-100 rounded text-[10px] py-0.5">{item.quantity}</span>
                  <span className="w-16 text-left font-semibold text-gray-700">{(item.product.price * item.quantity).toFixed(3)}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-gray-200 my-2" />

            {/* Totals */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>المجموع الفرعي</span>
                <span>{subtotal.toFixed(3)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>الخصم</span>
                  <span>-{discount.toFixed(3)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>الضريبة (19%)</span>
                <span>{tax.toFixed(3)}</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="bg-gradient-to-l from-emerald-50 to-blue-50 rounded-lg px-3 py-2.5 mt-3 flex justify-between items-center">
              <span className="font-bold text-gray-700">الإجمالي</span>
              <span className="font-black text-lg text-emerald-700">{total.toFixed(3)} <span className="text-xs">{CURRENCY}</span></span>
            </div>

            {/* Payment & Customer info */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">طريقة الدفع</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${paymentMethod === 'cash' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {paymentMethod === 'cash' ? '💵 نقدي' : '📝 آجل'}
                </span>
              </div>
              {customer && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">العميل</span>
                  <span className="font-medium text-gray-700">{customer.name}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 mt-3 pt-3 text-center">
              <p className="text-xs text-gray-400">شكراً لتعاملكم معنا! 🙏</p>
              <p className="text-[9px] text-gray-300 mt-1">Powered by Hani Kiosk POS</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={handlePrint}
            className="pos-button-primary text-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          <button
            onClick={handleExportPDF}
            className="pos-button-outline text-sm"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={handleShare}
            className="pos-button-outline text-sm"
          >
            <Share2 className="w-4 h-4" />
            مشاركة
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
