import { Download, Printer, Share2, X } from 'lucide-react';
import { PurchaseItem } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  const receiptRef = useRef<HTMLDivElement>(null);

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
      pdf.save(`فاتورة-مشتريات-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [invoiceNumber]);

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
        <!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>فاتورة مشتريات - ${invoiceNumber}</title>
        <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 5mm; direction: rtl; }
        .header { text-align: center; margin-bottom: 10px; } .header h1 { font-size: 16px; } .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .item { display: flex; justify-content: space-between; margin: 4px 0; } .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
        .grand-total { font-size: 14px; font-weight: bold; } .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }</style>
        </head><body>${receiptRef.current.innerHTML}<script>window.print(); window.close();</script></body></html>
      `);
      printWindow.document.close();
    }
  };

  const handleShare = async () => {
    const text = `
${kioskName} - فاتورة مشتريات
رقم الفاتورة: ${invoiceNumber}
التاريخ: ${format(invoiceDate, 'dd/MM/yyyy')}
${supplier ? `المورد: ${supplier.name}` : ''}
${'─'.repeat(20)}
${items.map(item => `${item.product.nameAr || item.product.name} x${item.quantity} @ ${item.cost.toFixed(3)} = ${item.total.toFixed(3)}`).join('\n')}
${'─'.repeat(20)}
الإجمالي: ${total.toFixed(3)} د.ت
    `.trim();

    if (navigator.share) {
      try { await navigator.share({ title: `فاتورة مشتريات ${invoiceNumber}`, text }); } catch {}
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
            فاتورة مشتريات
          </DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          className="bg-white text-black rounded-xl shadow-lg overflow-hidden text-sm"
          style={{ direction: 'rtl', fontFamily: "'Cairo', 'Courier New', monospace" }}
        >
          <div className="bg-gradient-to-l from-orange-600 to-amber-600 text-white px-5 py-4 text-center">
            <h1 className="text-xl font-bold tracking-wide">{kioskName}</h1>
            <p className="text-orange-100 text-xs mt-0.5">{kioskNameFr}</p>
            <p className="text-orange-200 text-[10px] mt-1 font-bold">فاتورة مشتريات</p>
            {storeAddress && <p className="text-orange-100 text-[10px] mt-1">📍 {storeAddress}</p>}
            {storePhone && <p className="text-orange-100 text-[10px]">📞 {storePhone}</p>}
            {commercialRegister && <p className="text-orange-100 text-[10px]">🏷️ س.ت: {commercialRegister}</p>}
          </div>

          <div className="px-5 py-3">
            <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <div>
                <p className="text-[10px] text-gray-400">رقم الفاتورة</p>
                <p className="text-xs font-bold text-gray-800">#{invoiceNumber}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-400">التاريخ</p>
                <p className="text-xs font-bold text-gray-800">{format(invoiceDate, 'dd/MM/yyyy')}</p>
              </div>
            </div>

            {supplier && (
              <div className="bg-amber-50 rounded-lg px-3 py-2 mb-3 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-800">{supplier.name}</span>
                <span className="text-[10px] text-amber-600">المورد</span>
              </div>
            )}

            <div className="flex justify-between text-[10px] text-gray-400 font-bold border-b border-gray-200 pb-1 mb-1">
              <span className="flex-1">المنتج</span>
              <span className="w-8 text-center">الكمية</span>
              <span className="w-14 text-center">التكلفة</span>
              <span className="w-16 text-left">الإجمالي</span>
            </div>

            <div className="space-y-1.5 mb-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs items-center">
                  <span className="flex-1 truncate font-medium text-gray-800">{item.product.nameAr || item.product.name}</span>
                  <span className="w-8 text-center text-gray-500 bg-gray-100 rounded text-[10px] py-0.5">{item.quantity}</span>
                  <span className="w-14 text-center text-gray-500">{item.cost.toFixed(3)}</span>
                  <span className="w-16 text-left font-semibold text-gray-700">{item.total.toFixed(3)}</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-dashed border-gray-200 my-2" />

            <div className="bg-gradient-to-l from-orange-50 to-amber-50 rounded-lg px-3 py-2.5 flex justify-between items-center">
              <span className="font-bold text-gray-700">الإجمالي</span>
              <span className="font-black text-lg text-orange-700">{total.toFixed(3)} <span className="text-xs">د.ت</span></span>
            </div>

            <div className="border-t border-gray-100 mt-3 pt-3 text-center">
              <p className="text-xs text-gray-400">فاتورة مشتريات 📦</p>
              <p className="text-[9px] text-gray-300 mt-1">Powered by Hani Kiosk POS</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={handlePrint} className="pos-button-primary text-sm">
            <Printer className="w-4 h-4" /> طباعة
          </button>
          <button onClick={handleExportPDF} className="pos-button-outline text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleShare} className="pos-button-outline text-sm">
            <Share2 className="w-4 h-4" /> مشاركة
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
