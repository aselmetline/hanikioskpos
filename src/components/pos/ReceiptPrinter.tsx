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
import { ar, fr } from 'date-fns/locale';
import { useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useLanguage } from '@/contexts/LanguageContext';

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
  storePhone?: string;
  storeAddress?: string;
  commercialRegister?: string;
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
  taxRate = 0.19,
  storePhone,
  storeAddress,
  commercialRegister,
}: ReceiptPrinterProps) {
  const { t, language, dir } = useLanguage();
  const dateLocale = language === 'ar' ? ar : fr;
  const receiptRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const invoiceNumber = generateInvoiceNumber(saleId);

  const productLabel = (item: CartItem) =>
    language === 'fr' ? (item.product.name || item.product.nameAr) : (item.product.nameAr || item.product.name);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="${dir}">
          <head>
            <meta charset="UTF-8">
            <title>${t('common.receipt')} - ${invoiceNumber}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Courier New', monospace; font-size: 12px; width: 58mm; padding: 5mm; direction: ${dir}; }
              .header { text-align: center; margin-bottom: 10px; }
              .header h1 { font-size: 16px; margin-bottom: 2px; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .grand-total { font-size: 14px; font-weight: bold; }
              .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
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
      const imgWidth = 80;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight + 10],
      });
      pdf.addImage(imgData, 'PNG', 0, 5, imgWidth, imgHeight);
      pdf.save(`${t('common.invoice')}-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [invoiceNumber, t]);

  const handleShare = async () => {
    const receiptText = `
${kioskName}
${kioskNameFr}
${t('receipt.invoiceNumber')}: ${invoiceNumber}
${format(now, 'dd/MM/yyyy HH:mm')}
${'─'.repeat(20)}
${items.map(item => `${productLabel(item)} x${item.quantity} = ${(item.product.price * item.quantity).toFixed(3)}`).join('\n')}
${'─'.repeat(20)}
${t('receipt.subtotal')}: ${subtotal.toFixed(3)} ${CURRENCY}
${discount > 0 ? `${t('receipt.discount')}: -${discount.toFixed(3)} ${CURRENCY}\n` : ''}${taxEnabled ? `${t('receipt.tax')} (${(taxRate * 100).toFixed(0)}%): ${tax.toFixed(3)} ${CURRENCY}\n` : ''}
${'─'.repeat(20)}
${t('receipt.total')}: ${total.toFixed(3)} ${CURRENCY}
${t('receipt.paymentMethod')}: ${paymentMethod === 'cash' ? t('receipt.cash') : t('receipt.credit')}
${customer ? `${t('receipt.customer')}: ${customer.name}` : ''}
${'─'.repeat(20)}
${t('receipt.thankYou')}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: `${t('common.receipt')} ${invoiceNumber}`, text: receiptText });
      } catch (err) { /* cancelled */ }
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
            {t('receipt.preview')}
          </DialogTitle>
        </DialogHeader>

        <div 
          ref={receiptRef}
          className="bg-white text-black rounded-xl shadow-lg overflow-hidden text-sm"
          style={{ direction: dir, fontFamily: "'Cairo', 'Courier New', monospace" }}
        >
          <div className="bg-gradient-to-l from-emerald-600 to-blue-600 text-white px-5 py-4 text-center">
            <h1 className="text-xl font-bold tracking-wide">{language === 'fr' ? kioskNameFr : kioskName}</h1>
            <p className="text-emerald-100 text-xs mt-0.5">{language === 'fr' ? kioskName : kioskNameFr}</p>
            {storeAddress && <p className="text-emerald-100 text-[10px] mt-1">📍 {storeAddress}</p>}
            {storePhone && <p className="text-emerald-100 text-[10px]">📞 {storePhone}</p>}
            {commercialRegister && <p className="text-emerald-100 text-[10px]">🏷️ {t('receipt.commercialRegister')}: {commercialRegister}</p>}
          </div>

          <div className="px-5 py-3">
            <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <div>
                <p className="text-[10px] text-gray-400">{t('receipt.invoiceNumber')}</p>
                <p className="text-xs font-bold text-gray-800">{invoiceNumber}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-400">{t('receipt.date')}</p>
                <p className="text-xs font-bold text-gray-800">{format(now, 'dd/MM/yyyy')}</p>
                <p className="text-[10px] text-gray-500">{format(now, 'HH:mm', { locale: dateLocale })}</p>
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 font-bold border-b border-gray-200 pb-1 mb-1">
              <span className="flex-1">{t('receipt.product')}</span>
              <span className="w-8 text-center">{t('receipt.qty')}</span>
              <span className="w-16 text-left">{t('receipt.price')}</span>
            </div>

            <div className="space-y-1.5 mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs items-center">
                  <span className="flex-1 truncate font-medium text-gray-800">{productLabel(item)}</span>
                  <span className="w-8 text-center text-gray-500 bg-gray-100 rounded text-[10px] py-0.5">{item.quantity}</span>
                  <span className="w-16 text-left font-semibold text-gray-700">{(item.product.price * item.quantity).toFixed(3)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-gray-200 my-2" />

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>{t('receipt.subtotal')}</span>
                <span>{subtotal.toFixed(3)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>{t('receipt.discount')}</span>
                  <span>-{discount.toFixed(3)}</span>
                </div>
              )}
              {taxEnabled && (
                <div className="flex justify-between text-gray-500">
                  <span>{t('receipt.tax')} ({(taxRate * 100).toFixed(0)}%)</span>
                  <span>{tax.toFixed(3)}</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-l from-emerald-50 to-blue-50 rounded-lg px-3 py-2.5 mt-3 flex justify-between items-center">
              <span className="font-bold text-gray-700">{t('receipt.total')}</span>
              <span className="font-black text-lg text-emerald-700">{total.toFixed(3)} <span className="text-xs">{CURRENCY}</span></span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">{t('receipt.paymentMethod')}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${paymentMethod === 'cash' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {paymentMethod === 'cash' ? `💵 ${t('receipt.cash')}` : `📝 ${t('receipt.credit')}`}
                </span>
              </div>
              {customer && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('receipt.customer')}</span>
                  <span className="font-medium text-gray-700">{customer.name}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 mt-3 pt-3 text-center">
              <p className="text-xs text-gray-400">{t('receipt.thankYou')} 🙏</p>
              <p className="text-[9px] text-gray-300 mt-1">Powered by Hani Kiosk POS</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={handlePrint} className="pos-button-primary text-sm">
            <Printer className="w-4 h-4" /> {t('receipt.print')}
          </button>
          <button onClick={handleExportPDF} className="pos-button-outline text-sm">
            <Download className="w-4 h-4" /> {t('receipt.pdf')}
          </button>
          <button onClick={handleShare} className="pos-button-outline text-sm">
            <Share2 className="w-4 h-4" /> {t('receipt.share')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
