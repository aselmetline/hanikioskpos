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
import { exportElementToA4PDF } from '@/utils/pdfPaginate';
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
  logo?: string | null;
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
  logo,
  autoExport = false,
}: PurchaseReceiptPrinterProps) {
  const { t, language, dir } = useLanguage();
  const receiptRef = useRef<HTMLDivElement>(null);

  const productLabel = (item: PurchaseItem) =>
    language === 'fr' ? (item.product.name || item.product.nameAr) : (item.product.nameAr || item.product.name);

  const handleExportPDF = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      await exportElementToA4PDF(receiptRef.current, `${t('receipt.purchaseInvoice')}-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [invoiceNumber, t]);

  useEffect(() => {
    if (open && autoExport) {
      const timer = setTimeout(() => handleExportPDF(), 600);
      return () => clearTimeout(timer);
    }
  }, [open, autoExport, handleExportPDF]);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8">
        <title>${t('receipt.purchaseInvoice')} - ${invoiceNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { font-family: 'Cairo', sans-serif; direction: ${dir}; background: #FAFAF7; }
        </style>
        </head><body>${receiptRef.current.outerHTML}<script>setTimeout(()=>{window.print();window.close();},300);</script></body></html>
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

  // Classic Corporate palette
  const INK = '#0A1428';
  const INK_LIGHT = '#2D3A54';
  const INK_FADED = '#64748B';
  const GOLD = '#9E7B3A';
  const PAPER = '#FAFAF7';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              {t('receipt.purchaseInvoice')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary" dir="ltr">
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {t('receipt.invoiceNumber')}
              </span>
              <span className="font-mono">{invoiceNumber}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div
          ref={receiptRef}
          dir={dir}
          style={{
            fontFamily: "'Cairo', sans-serif",
            background: PAPER,
            color: INK,
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            transform: 'scale(0.7)',
            transformOrigin: 'top center',
          }}
        >
          {/* Watermark */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', opacity: 0.03 }}>
            <div style={{ fontSize: '180px', fontWeight: 'bold', transform: 'rotate(-30deg)', lineHeight: 1, letterSpacing: '-0.05em' }}>HANI</div>
          </div>

          <div style={{ height: '16px', background: INK }} />
          <div style={{ height: '4px', background: GOLD, marginTop: '4px' }} />

          <div style={{ padding: '40px 56px', display: 'flex', flexDirection: 'column', minHeight: 'calc(297mm - 60px)' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${INK}`, paddingBottom: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {logo && (
                  <div style={{ background: 'rgba(10,20,40,0.05)', border: '1px solid rgba(10,20,40,0.2)', padding: '6px', flexShrink: 0 }}>
                    <img src={logo} alt="Logo" style={{ width: '72px', height: '72px', objectFit: 'cover' }} />
                  </div>
                )}
                <div>
                  <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '4px' }}>
                    {language === 'fr' ? kioskNameFr : kioskName}
                    <span style={{ fontSize: '16px', fontWeight: 400, color: INK_LIGHT, margin: '0 12px' }} dir="ltr">
                      {language === 'fr' ? kioskName : kioskNameFr}
                    </span>
                  </h1>
                  <div style={{ fontSize: '12px', color: INK_LIGHT, lineHeight: 1.8, marginTop: '8px' }}>
                    {storeAddress && <p>📍 {storeAddress}</p>}
                    {storePhone && <p>📞 <span dir="ltr">{storePhone}</span></p>}
                    {commercialRegister && (
                      <p style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(10,20,40,0.1)', display: 'inline-block' }}>
                        <span style={{ fontWeight: 600 }}>RC:</span> <span dir="ltr">{commercialRegister}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'left' }} dir="ltr">
                <div style={{ display: 'inline-block', border: `4px solid ${INK}`, padding: '8px 24px', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '28px', fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: '0.12em' }}>BON D'ACHAT</h2>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textAlign: 'center', letterSpacing: '0.15em' }}>فاتورة شراء</h3>
                </div>
                <div className="invoice-badge" style={{ background: INK, color: 'white', borderInlineStart: `4px solid ${GOLD}`, padding: '8px 12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: dir === 'rtl' ? 'right' : 'left', boxSizing: 'border-box', maxWidth: '100%', wordBreak: 'break-all' }}>
                  <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.75 }}>N° Facture / رقم الفاتورة</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.15 }}>{invoiceNumber}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '12px' }}>
                  <span style={{ color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', alignSelf: 'center' }}>Date</span>
                  <span style={{ fontWeight: 600 }}>{format(invoiceDate, 'dd MMM yyyy')}</span>
                </div>
              </div>
            </header>

            {/* Supplier block */}
            {supplier && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: '#FDFBF5', border: `1px solid ${GOLD}40`, padding: '16px' }}>
                  <h4 style={{ fontSize: '10px', fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    {t('receipt.supplier')} / Fournisseur
                  </h4>
                  <p style={{ fontWeight: 700, fontSize: '15px' }}>{supplier.name}</p>
                  {supplier.phone && <p style={{ fontSize: '12px', color: INK_LIGHT, marginTop: '4px' }} dir="ltr">{supplier.phone}</p>}
                </div>
                <div />
              </div>
            )}

            {/* Products table */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 2fr', gap: '16px', borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}`, padding: '12px 0', fontSize: '12px', fontWeight: 700 }}>
                <div>{t('receipt.product')} <span style={{ color: INK_FADED, fontWeight: 400 }}>/ Désignation</span></div>
                <div style={{ textAlign: 'center' }}>{t('receipt.qty')} <span style={{ color: INK_FADED, fontWeight: 400 }}>/ Qté</span></div>
                <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }} dir="ltr">P.U (TND)</div>
                <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }} dir="ltr">Total (TND)</div>
              </div>
              <div style={{ fontSize: '13px' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 2fr', gap: '16px', padding: '14px 0', borderBottom: '1px solid rgba(10,20,40,0.1)', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600 }}>{productLabel(item)}</div>
                    <div style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</div>
                    <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }} dir="ltr">{item.cost.toFixed(3)}</div>
                    <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left', fontWeight: 600 }} dir="ltr">{item.total.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(10,20,40,0.2)', paddingTop: '32px' }}>
              <div style={{ width: '320px' }} dir="ltr">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: INK, color: 'white', borderLeft: `4px solid ${GOLD}` }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8, marginBottom: '2px' }}>Total à Payer</p>
                    <p style={{ fontSize: '12px', opacity: 0.9 }}>المبلغ الجملي</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '28px', fontFamily: "'Playfair Display', serif", letterSpacing: '-0.02em' }}>{total.toFixed(3)}</span>
                    <span style={{ fontSize: '13px', marginLeft: '6px', opacity: 0.8 }}>TND</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer style={{ background: 'rgba(10,20,40,0.05)', padding: '20px', textAlign: 'center', borderTop: '1px solid rgba(10,20,40,0.1)' }}>
            <p style={{ color: INK, fontWeight: 600, fontSize: '13px' }}>{t('receipt.purchaseInvoice')} 📦</p>
            <p style={{ fontSize: '10px', color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '8px' }}>
              ━━━ Powered by Hani Kiosk POS ━━━
            </p>
          </footer>
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
