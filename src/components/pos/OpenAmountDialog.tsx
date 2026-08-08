import { useEffect, useState } from 'react';
import { X, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { useLanguage } from '@/contexts/LanguageContext';

interface OpenAmountDialogProps {
  open: boolean;
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
}

const QUICK_AMOUNTS = [1, 2, 5, 10, 20, 50];

export function OpenAmountDialog({ open, product, onOpenChange, onConfirm }: OpenAmountDialogProps) {
  const { t, dir } = useLanguage();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) setAmount('');
  }, [open, product]);

  if (!open || !product) return null;

  const value = parseFloat(amount);
  const valid = !Number.isNaN(value) && value > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onConfirm(value);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" dir={dir}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <div className="relative z-50 w-full max-w-sm bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-base font-bold truncate">{product.nameAr || product.name}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openAmount">{t('sell.enterAmount')}</Label>
            <Input
              id="openAmount"
              type="number"
              step="0.001"
              min="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.000"
              dir="ltr"
              className="h-14 text-2xl font-bold text-center"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(q.toFixed(3))}
                className="h-11 rounded-xl bg-secondary font-bold text-sm"
              >
                {q} {CURRENCY}
              </button>
            ))}
          </div>

          <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl" disabled={!valid}>
            {t('sell.addAmount')}
          </Button>
        </form>
      </div>
    </div>
  );
}
