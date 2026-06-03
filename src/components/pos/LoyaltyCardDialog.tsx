import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, Copy, Check, Download, Share2 } from 'lucide-react';
import { Customer } from '@/types/pos';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  storeName?: string;
}

export function LoyaltyCardDialog({ open, onOpenChange, customer, storeName }: Props) {
  const { dir } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const externalId = customer.externalId || `cust_${customer.id.slice(0, 12)}`;

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(externalId, {
      width: 320,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(setQrUrl).catch(() => setQrUrl(''));
  }, [open, externalId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(externalId);
      setCopied(true);
      toast.success('تم نسخ المعرّف');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `loyalty-${externalId}.png`;
    a.click();
  };

  const handleShare = async () => {
    const text = `بطاقة ولاء — ${customer.name}\nالنقاط: ${customer.points}\nالمعرّف: ${externalId}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'بطاقة ولاء', text }); return; } catch { /* ignore */ }
    }
    await navigator.clipboard.writeText(text);
    toast.success('تم نسخ بيانات البطاقة');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden" dir={dir}>
        <DialogHeader className="sr-only">
          <DialogTitle>بطاقة ولاء {customer.name}</DialogTitle>
        </DialogHeader>

        {/* Card */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-success text-primary-foreground p-5">
          <div className="absolute inset-0 opacity-10 pointer-events-none"
               style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <p className="text-xs opacity-80">{storeName || 'Hani Kiosk'}</p>
              <p className="text-lg font-bold leading-tight">HaniWafa</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <div className="relative">
            <p className="text-sm opacity-90 truncate">{customer.name}</p>
            <div className="flex items-end justify-between mt-1">
              <div>
                <p className="text-xs opacity-80">النقاط</p>
                <p className="text-3xl font-extrabold tabular-nums">{customer.points}</p>
              </div>
              {customer.creditBalance > 0 && (
                <div className="text-right">
                  <p className="text-xs opacity-80">الرصيد المدين</p>
                  <p className="text-base font-bold">{customer.creditBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR + ID */}
        <div className="p-5 space-y-4 bg-card">
          <div className="flex justify-center">
            {qrUrl ? (
              <img src={qrUrl} alt="QR" className="w-48 h-48 rounded-lg border bg-white p-2" />
            ) : (
              <canvas ref={canvasRef} className="w-48 h-48" />
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">معرّف العميل (Customer ID)</p>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left font-mono text-sm"
            >
              <span className="truncate">{externalId}</span>
              {copied ? <Check className="w-4 h-4 text-success shrink-0" /> : <Copy className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              امسح رمز QR أو أدخل المعرّف لإعادة ربط الحساب دون فقدان النقاط.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              تنزيل
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
            >
              <Share2 className="w-4 h-4" />
              مشاركة
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
