import { useMemo, useState } from 'react';
import { ArrowLeftRight, Repeat, History, Coins } from 'lucide-react';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useT } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { InternalTransfer } from '@/hooks/useInternalTransfers';

interface TransfersTabProps {
  products: Product[];
  transfers: InternalTransfer[];
  loading?: boolean;
  onTransfer: (
    sourceProductId: string,
    sourceQuantity: number,
    targetProductId: string,
    notes?: string,
  ) => Promise<{ target_quantity: number; remainder_value: number } | null>;
}

const fmt = (n: number) => `${n.toFixed(3)} ${CURRENCY}`;

/** Internal transfers are valued at the stored purchase cost (falls back to price). */
const costOf = (p: Product) => (p.cost && p.cost > 0 ? p.cost : p.price || 0);

export function TransfersTab({ products, transfers, loading = false, onTransfer }: TransfersTabProps) {
  const t = useT();
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const source = products.find(p => p.id === sourceId);
  const target = products.find(p => p.id === targetId);
  const qty = Math.floor(Number(quantity) || 0);
  const sourceUnit = source ? costOf(source) : 0;
  const targetUnit = target ? costOf(target) : 0;

  // Dinar-based valuation: source value -> target units at target purchase cost.
  const preview = useMemo(() => {
    if (!source || !target || qty <= 0 || targetUnit <= 0) return null;
    const totalValue = Number((sourceUnit * qty).toFixed(3));
    const targetQty = Math.floor(totalValue / targetUnit);
    const remainder = Number((totalValue - targetQty * targetUnit).toFixed(3));
    return { totalValue, targetQty, remainder };
  }, [source, target, qty, sourceUnit, targetUnit]);

  const canPreview =
    !!source && !!target && sourceId !== targetId && qty > 0 && qty <= (source?.stock ?? 0) && !!preview && preview.targetQty > 0;

  const handleConfirm = async () => {
    if (!source || !target || !preview) return;
    setSubmitting(true);
    const res = await onTransfer(source.id, qty, target.id, notes.trim() || undefined);
    setSubmitting(false);
    setConfirmOpen(false);
    if (res) {
      toast.success(`${t('transfers.success')}: ${res.target_quantity} × ${target.nameAr || target.name}`);
      setQuantity('1');
      setNotes('');
    }
  };

  return (
    <div className="p-4 pb-28 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold">{t('transfers.title')}</h2>
          <p className="text-xs text-muted-foreground">{t('transfers.subtitle')}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('transfers.source')}</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue placeholder={t('transfers.selectProduct')} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p.nameAr || p.name)} — {fmt(p.price)} ({t('transfers.available')}: {p.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('transfers.target')}</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue placeholder={t('transfers.selectProduct')} /></SelectTrigger>
              <SelectContent className="max-h-72">
                {products.filter(p => p.id !== sourceId && p.price > 0).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {(p.nameAr || p.name)} — {fmt(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('transfers.quantity')}</Label>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
            {source && qty > source.stock && (
              <p className="text-xs text-destructive">{t('transfers.insufficientStock')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('transfers.notes')}</Label>
            <Textarea
              rows={1}
              maxLength={500}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('transfers.notesPlaceholder')}
            />
          </div>
        </div>

        {/* Preview */}
        {preview && source && target ? (
          <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 font-bold text-primary">
              <Coins className="w-4 h-4" />
              {t('transfers.previewTitle')}
            </div>
            <Row label={t('transfers.source')} value={source.nameAr || source.name} />
            <Row label={t('transfers.quantity')} value={String(qty)} />
            <Row label={t('transfers.sourceUnitValue')} value={fmt(source.price)} />
            <Row label={t('transfers.sourceValue')} value={fmt(preview.totalValue)} bold />
            <Row label={t('transfers.target')} value={target.nameAr || target.name} />
            <Row label={t('transfers.targetUnitPrice')} value={fmt(target.price)} />
            <Row label={t('transfers.resultQuantity')} value={String(preview.targetQty)} bold />
            <Row label={t('transfers.remainder')} value={fmt(preview.remainder)} />
            {preview.targetQty === 0 && (
              <p className="text-xs text-destructive">{t('transfers.notEnoughValue')}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('transfers.fillToPreview')}</p>
        )}

        <Button className="w-full" disabled={!canPreview || submitting} onClick={() => setConfirmOpen(true)}>
          <Repeat className="w-4 h-4 me-2" />
          {t('transfers.execute')}
        </Button>
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-bold">{t('transfers.history')}</h3>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('transfers.noHistory')}</p>
        ) : (
          <div className="space-y-2">
            {transfers.map(tr => (
              <div key={tr.id} className="bg-card border border-border rounded-xl p-3 text-sm shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold">
                    {tr.sourceQuantity} × {tr.sourceProductName}
                    <ArrowLeftRight className="inline w-3.5 h-3.5 mx-2 text-primary" />
                    {tr.targetQuantity} × {tr.targetProductName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tr.createdAt.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground flex gap-3 flex-wrap">
                  <span>{t('transfers.sourceValue')}: {fmt(tr.sourceTotalValue)}</span>
                  <span>{t('transfers.targetUnitPrice')}: {fmt(tr.targetUnitPrice)}</span>
                  <span>{t('transfers.remainder')}: {fmt(tr.remainderValue)}</span>
                </div>
                {tr.notes && <p className="mt-1 text-xs">{tr.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('transfers.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {source && target && preview
                ? `${qty} × ${source.nameAr || source.name} (${fmt(preview.totalValue)}) → ${preview.targetQty} × ${target.nameAr || target.name} — ${t('transfers.remainder')}: ${fmt(preview.remainder)}`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium'}>{value}</span>
    </div>
  );
}
