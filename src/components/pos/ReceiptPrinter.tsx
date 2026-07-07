import { Printer, Share2, Download } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { useRef, useCallback } from 'react';
import { exportElementToA4PDF } from '@/utils/pdfPaginate';
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
  logo?: string | null;
  matriculeFiscal?: string;
  invoiceNumber?: number;
  fiscalStamp?: number;
  taxBreakdown?: Record<string, { base: number; tax: number }>;
}

function formatInvoiceNumber(invoiceNumber?: number, saleId?: string): string {
  if (invoiceNumber != null) {
    return `${format(new Date(), 'yyyy')}-${String(invoiceNumber).padStart(6, '0')}`;
  }
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
  logo,
  matriculeFiscal,
  invoiceNumber,
  fiscalStamp = 0,
  taxBreakdown,
}: ReceiptPrinterProps) {
  const { t, language, dir } = useLanguage();
  const receiptRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const displayInvoice = formatInvoiceNumber(invoiceNumber, saleId);

  const productLabel = (item: CartItem) =>
    language === 'fr' ? (item.product.name || item.product.nameAr) : (item.product.nameAr || item.product.name);

  const handleExportPDF = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      await exportElementToA4PDF(receiptRef.current, `${t('common.invoice')}-${invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }, [invoiceNumber, t]);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html><html dir="${dir}"><head><meta charset="UTF-8">
        <title>${t('common.receipt')} - ${invoiceNumber}</title>
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
    const receiptText = `
${language === 'fr' ? kioskNameFr : kioskName}
${t('receipt.invoiceNumber')}: ${invoiceNumber}
${format(now, 'dd/MM/yyyy HH:mm')}
${'─'.repeat(20)}
${items.map(item => `${productLabel(item)} x${item.quantity} = ${(item.product.price * item.quantity).toFixed(3)}`).join('\n')}
${'─'.repeat(20)}
${t('receipt.subtotal')}: ${subtotal.toFixed(3)} ${CURRENCY}
${discount > 0 ? `${t('receipt.discount')}: -${discount.toFixed(3)} ${CURRENCY}\n` : ''}${taxEnabled ? `${t('receipt.tax')} (${(taxRate * 100).toFixed(0)}%): ${tax.toFixed(3)} ${CURRENCY}\n` : ''}${t('receipt.total')}: ${total.toFixed(3)} ${CURRENCY}
${t('receipt.paymentMethod')}: ${paymentMethod === 'cash' ? t('receipt.cash') : t('receipt.credit')}
${customer ? `${t('receipt.customer')}: ${customer.name}` : ''}
${t('receipt.thankYou')}
    `.trim();

    if (navigator.share) {
      try { await navigator.share({ title: `${t('common.receipt')} ${invoiceNumber}`, text: receiptText }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(receiptText)}`, '_blank');
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
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            {t('receipt.preview')}
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

          {/* Top bars */}
          <div style={{ height: '16px', background: INK }} />
          <div style={{ height: '4px', background: GOLD, marginTop: '4px' }} />

          <div style={{ padding: '40px 56px', display: 'flex', flexDirection: 'column', minHeight: 'calc(297mm - 60px)' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2px solid ${INK}`, paddingBottom: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                {logo && (
                  <div style={{ background: 'rgba(10,20,40,0.05)', border: `1px solid rgba(10,20,40,0.2)`, padding: '6px', flexShrink: 0 }}>
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
                    {storePhone && <p dir="ltr" style={{ direction: dir }}>📞 <span dir="ltr">{storePhone}</span></p>}
                    {commercialRegister && (
                      <p style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(10,20,40,0.1)', display: 'inline-block' }}>
                        <span style={{ fontWeight: 600 }}>RC:</span> <span dir="ltr">{commercialRegister}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'left' }} dir="ltr">
                <div style={{ display: 'inline-block', border: `4px solid ${INK}`, padding: '8px 24px', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: 700, fontFamily: "'Playfair Display', serif", letterSpacing: '0.15em' }}>FACTURE</h2>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, textAlign: 'center', letterSpacing: '0.15em' }}>فاتورة</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', fontSize: '12px' }}>
                  <span style={{ color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', alignSelf: 'center' }}>N° Facture</span>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{invoiceNumber}</span>
                  <span style={{ color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', alignSelf: 'center' }}>Date</span>
                  <span style={{ fontWeight: 600 }}>{format(now, 'dd MMM yyyy')}</span>
                  <span style={{ color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', alignSelf: 'center' }}>Heure</span>
                  <span style={{ fontWeight: 600 }}>{format(now, 'HH:mm:ss')}</span>
                </div>
              </div>
            </header>

            {/* Customer block */}
            {customer && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: '#F4F4F0', border: '1px solid rgba(10,20,40,0.15)', padding: '16px' }}>
                  <h4 style={{ fontSize: '10px', fontWeight: 700, color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    {t('receipt.customer')} / Client
                  </h4>
                  <p style={{ fontWeight: 700, fontSize: '15px' }}>{customer.name}</p>
                  {customer.phone && <p style={{ fontSize: '12px', color: INK_LIGHT, marginTop: '4px' }} dir="ltr">{customer.phone}</p>}
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
                    <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }} dir="ltr">{item.product.price.toFixed(3)}</div>
                    <div style={{ textAlign: dir === 'rtl' ? 'right' : 'left', fontWeight: 600 }} dir="ltr">{(item.product.price * item.quantity).toFixed(3)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals + payment */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(10,20,40,0.2)', paddingTop: '32px', gap: '24px' }}>
              <div style={{ width: '240px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: INK_FADED, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  {t('receipt.paymentMethod')} / Paiement
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid rgba(10,20,40,0.15)', background: 'white' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: paymentMethod === 'cash' ? '#10b981' : '#f59e0b' }} />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>
                    {paymentMethod === 'cash' ? t('receipt.cash') : t('receipt.credit')}
                  </span>
                </div>
              </div>

              <div style={{ width: '320px' }} dir="ltr">
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(10,20,40,0.1)', fontSize: '13px' }}>
                  <span style={{ color: INK_LIGHT }}>Sous-total</span>
                  <span style={{ fontWeight: 600 }}>{subtotal.toFixed(3)}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(10,20,40,0.1)', fontSize: '13px', color: '#dc2626' }}>
                    <span>Remise</span>
                    <span style={{ fontWeight: 600 }}>-{discount.toFixed(3)}</span>
                  </div>
                )}
                {taxEnabled && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(10,20,40,0.1)', fontSize: '13px' }}>
                    <span style={{ color: INK_LIGHT }}>TVA ({(taxRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontWeight: 600 }}>{tax.toFixed(3)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginTop: '8px', background: INK, color: 'white', borderLeft: `4px solid ${GOLD}` }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8, marginBottom: '2px' }}>Net à Payer</p>
                    <p style={{ fontSize: '12px', opacity: 0.9 }}>المبلغ الجملي</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '28px', fontFamily: "'Playfair Display', serif", letterSpacing: '-0.02em' }}>{total.toFixed(3)}</span>
                    <span style={{ fontSize: '13px', marginLeft: '6px', opacity: 0.8 }}>{CURRENCY}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ background: 'rgba(10,20,40,0.05)', padding: '20px', textAlign: 'center', borderTop: '1px solid rgba(10,20,40,0.1)' }}>
            <p style={{ color: INK, fontWeight: 600, fontSize: '13px' }}>{t('receipt.thankYou')}</p>
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
