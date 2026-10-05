import { useEffect, useState } from 'react';
import { Banknote, X, Check } from 'lucide-react';
import { CURRENCY } from '@/data/sampleData';
import { useT } from '@/contexts/LanguageContext';

interface CashPaymentModalProps {
  open: boolean;
  totalDue: number;
  onClose: () => void;
  onConfirm: (amountPaid: number, change: number) => void;
  busy?: boolean;
}

const BILLS = [5, 10, 20, 50];

// Work in millimes to avoid float drift on 3-decimal TND amounts.
const toMillimes = (v: number) => Math.round(v * 1000);

export function CashPaymentModal({ open, totalDue, onClose, onConfirm, busy }: CashPaymentModalProps) {
  const t = useT();
  const [input, setInput] = useState('');

  useEffect(() => {
    if (open) setInput('');
  }, [open]);

  if (!open) return null;

  const paid = parseFloat(input.replace(',', '.')) || 0;
  const dueM = toMillimes(totalDue);
  const paidM = toMillimes(paid);
  const changeM = paidM - dueM;
  const insufficient = input !== '' && changeM < 0;
  const canConfirm = !busy && (input === '' || changeM >= 0);

  const confirm = () => {
    if (!canConfirm) return;
    const effectivePaid = input === '' ? totalDue : paid;
    onConfirm(effectivePaid, input === '' ? 0 : changeM / 1000);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={onClose} className="w-10 h-10 bg-muted rounded-full flex items-center justify-center" aria-label={t('common.cancel')}>
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-bold text-lg">
            <Banknote className="w-5 h-5 text-success" />
            {t('sell.cashPayment')}
          </div>
          <div className="w-10" />
        </div>

        <div className="p-4 space-y-4">
          <div className="text-center bg-muted rounded-xl py-4">
            <p className="text-sm text-muted-foreground">{t('sell.amountDue')}</p>
            <p className="text-4xl font-extrabold text-primary" dir="ltr">{totalDue.toFixed(3)} <span className="text-lg">{CURRENCY}</span></p>
          </div>

          <div>
            <label className="text-sm font-bold">{t('sell.amountReceived')}</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              placeholder={totalDue.toFixed(3)}
              className="pos-input text-2xl font-bold text-center mt-1"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
            <button onClick={() => setInput(totalDue.toFixed(3))} className="pos-button-outline text-xs py-2 px-1">
              {t('sell.exact')}
            </button>
            {BILLS.map((b) => (
              <button key={b} onClick={() => setInput(String(b))} className="pos-button-outline text-sm py-2 px-1 font-bold">
                {b}
              </button>
            ))}
          </div>

          <div className={`text-center rounded-xl py-4 ${insufficient ? 'bg-destructive/10' : 'bg-success/10'}`}>
            <p className="text-sm text-muted-foreground">{insufficient ? t('sell.missingAmount') : t('sell.changeDue')}</p>
            <p className={`text-4xl font-extrabold ${insufficient ? 'text-destructive' : 'text-success'}`} dir="ltr">
              {(Math.abs(input === '' ? 0 : changeM) / 1000).toFixed(3)} <span className="text-lg">{CURRENCY}</span>
            </p>
          </div>

          <button
            onClick={confirm}
            disabled={!canConfirm}
            style={canConfirm ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
            className="pos-button-success w-full py-3 text-base"
          >
            <Check className="w-5 h-5" />
            {t('sell.confirmAndPrint')}
          </button>
        </div>
      </div>
    </div>
  );
}
