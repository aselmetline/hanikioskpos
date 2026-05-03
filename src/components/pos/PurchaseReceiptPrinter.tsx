import { Download, Printer, Share2 } from 'lucide-react';
import { PurchaseItem } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useLanguage } from '@/contexts/LanguageContext';

interface PurchaseReceiptPrinterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: PurchaseItem[];
  total: number;
  invoiceNumber: string;
  invoiceDate: Date;
  supplier?: Supplier;
  kioskName?: string;
  kioskNameFr?: string;
  storePhone?: string;
  storeAddress?: string;
  commercialRegister?: string;
  autoExport?: boolean;
}

export function PurchaseReceiptPrinter({
  open,
  onOpenChange,
  items,
  total,
  invoiceNumber,
  invoiceDate,
  supplier,
  kioskName = 'كشك هاني',
  kioskNameFr = 'Hani Kiosk',
  storePhone,
  storeAddress,
  commercialRegister,
  autoExport = false,
}: PurchaseReceiptPrinterProps) {
  const { t, language, dir } = useLanguage();
  const receiptRef = useRef<HTMLDivElement>(null);

  const productLabel = (item: PurchaseItem) =>
    language === 'fr' ? (item.product.name || item.product.nameAr) : (item.product.nameAr || item.product.name);

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
      pdf.save(`${t('receipt.purchaseInvoice')}-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [invoiceNumber, t]);

  useEffect(() => {
    if (open && autoExport) {
      const timer = setTimeout(() => handleExportPDF(), 500);
      return () => clearTimeout(timer);
    }
  }, [open, autoExport, handleExportPDF]);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8"><title>${t('receipt.purchaseInvoice')} - ${invoiceNumber}</title>
        <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 5mm; direction: ${dir}; }</style>
        </head><body>${receiptRef.current.innerHTML}<script>window.print(); window.close();</script></body></html>
      `);
      printWindow.document.close();
    }
  };

  const handleShare = async () => {
    const text = `
${language === 'fr' ? kioskNameFr : kioskName} - ${t('receipt.purchaseInvoice')}
${t('receipt.invoiceNumber')}: ${invoiceNumber}
${t('receipt.date')}: ${format(invoiceDate, 'dd/MM/yyyy')}
${supplier ? `${t('receipt.supplier')}: ${supplier.name}` : ''}
${'─'.repeat(20)}
${items.map(item => `${productLabel(item)} x${item.quantity} @ ${item.cost.toFixed(3)} = ${item.total.toFixed(3)}`).join('\n')}
${'─'.repeat(20)}
${t('receipt.total')}: ${total.toFixed(3)} TND
    `.trim();

    if (navigator.share) {
      try { await navigator.share({ title: `${t('receipt.purchaseInvoice')} ${invoiceNumber}`, text }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            {t('receipt.purchaseInvoice')}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="bg-white text-black rounded-xl shadow-lg overflow-hidden text-sm"
          style={{ direction: dir, fontFamily: "'Cairo', 'Courier New', monospace" }}
        >
          <div className="bg-gradient-to-l from-orange-600 to-amber-600 text-white px-5 py-4 text-center">
            <h1 className="text-xl font-bold tracking-wide">{language === 'fr' ? kioskNameFr : kioskName}</h1>
            <p className="text-orange-100 text-xs mt-0.5">{language === 'fr' ? kioskName : kioskNameFr}</p>
            <p className="text-orange-200 text-[10px] mt-1 font-bold">{t('receipt.purchaseInvoice')}</p>
            {storeAddress && <p className="text-orange-100 text-[10px] mt-1">📍 {storeAddress}</p>}
            {storePhone && <p className="text-orange-100 text-[10px]">📞 {storePhone}</p>}
            {commercialRegister && <p className="text-orange-100 text-[10px]">🏷️ {t('receipt.commercialRegister')}: {commercialRegister}</p>}
          </div>

          <div className="px-5 py-3">
            <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <div>
                <p className="text-[10px] text-gray-400">{t('receipt.invoiceNumber')}</p>
                <p className="text-xs font-bold text-gray-800">#{invoiceNumber}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-400">{t('receipt.date')}</p>
                <p className="text-xs font-bold text-gray-800">{format(invoiceDate, 'dd/MM/yyyy')}</p>
              </div>
            </div>

            {supplier && (
              <div className="bg-amber-50 rounded-lg px-3 py-2 mb-3 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-800">{supplier.name}</span>
                <span className="text-[10px] text-amber-600">{t('receipt.supplier')}</span>
              </div>
            )}

            <div className="flex justify-between text-[10px] text-gray-400 font-bold border-b border-gray-200 pb-1 mb-1">
              <span className="flex-1">{t('receipt.product')}</span>
              <span className="w-8 text-center">{t('receipt.qty')}</span>
              <span className="w-14 text-center">{t('receipt.cost')}</span>
              <span className="w-16 text-left">{t('receipt.total')}</span>
            </div>

            <div className="space-y-1.5 mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs items-center">
                  <span className="flex-1 truncate font-medium text-gray-800">{productLabel(item)}</span>
                  <span className="w-8 text-center text-gray-500 bg-gray-100 rounded text-[10px] py-0.5">{item.quantity}</span>
                  <span className="w-14 text-center text-gray-500">{item.cost.toFixed(3)}</span>
                  <span className="w-16 text-left font-semibold text-gray-700">{item.total.toFixed(3)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-gray-200 my-2" />

            <div className="bg-gradient-to-l from-orange-50 to-amber-50 rounded-lg px-3 py-2.5 flex justify-between items-center">
              <span className="font-bold text-gray-700">{t('receipt.total')}</span>
              <span className="font-black text-lg text-orange-700">{total.toFixed(3)} <span className="text-xs">TND</span></span>
            </div>

            <div className="border-t border-gray-100 mt-3 pt-3 text-center">
              <p className="text-xs text-gray-400">{t('receipt.purchaseInvoice')} 📦</p>
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
