import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Check, Loader2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export interface StagedItem {
  name: string; name_ar: string; category: string; unit: string;
  cost: number; price: number; stock: number; tax_rate: number;
  product_id: string | null; existing: { stock: number } | null;
}
export interface StagedPreview {
  preview_id: string; idempotency_key: string; items: StagedItem[];
  supplier_name: string | null; supplier_id: string | null;
  create_purchase: boolean; payment_method: 'cash' | 'credit';
}

export function StagedIngestionCard({ preview }: { preview: StagedPreview }) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<StagedItem[]>(preview.items);
  const [createPurchase, setCreatePurchase] = useState(preview.create_purchase);
  const [payment, setPayment] = useState(preview.payment_method);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const upd = (i: number, k: keyof StagedItem, v: string) =>
    setItems((prev) => prev.map((it, j) => j === i ? { ...it, [k]: ['name', 'name_ar'].includes(k) ? v : Number(v) } : it));
  const total = items.reduce((a, it) => a + it.cost * it.stock, 0);
  const nameKey = language === 'ar' ? 'name_ar' : 'name';

  const commit = async () => {
    if (busy || done) return;
    setBusy(true);
    const { error } = await supabase.rpc('commit_staged_ingestion', {
      p_preview_id: preview.preview_id,
      p_idempotency_key: preview.idempotency_key,
      p_overrides: { items, create_purchase: createPurchase, payment_method: payment } as never,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDone(true);
    toast.success(t('copilot.added'));
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 font-bold"><PackagePlus className="w-4 h-4 text-primary" />{t('copilot.previewTitle')}</div>
      {preview.supplier_name && <div className="text-xs text-muted-foreground">{t('copilot.supplier')}: {preview.supplier_name}</div>}
      {items.map((it, i) => (
        <div key={i} className="rounded-lg bg-secondary/50 p-2 space-y-1">
          <div className="flex items-center gap-2">
            <Input value={it[nameKey]} onChange={(e) => upd(i, nameKey, e.target.value)} disabled={done} className="h-8" />
            <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${it.product_id ? 'bg-warning/20' : 'bg-success/20'}`}>
              {it.product_id ? `${t('copilot.update')} (${t('copilot.current')}: ${it.existing?.stock ?? 0})` : t('copilot.isNew')}
            </span>
            {!done && <button onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={t('copilot.removeItem')}><Trash2 className="w-4 h-4 text-destructive" /></button>}
          </div>
          <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
            <span>{t('copilot.qty')}</span><span>{t('copilot.cost')}</span><span>{t('copilot.price')}</span><span>{t('copilot.tva')}</span>
            {(['stock', 'cost', 'price', 'tax_rate'] as const).map((k) => (
              <Input key={k} type="number" step={k === 'stock' || k === 'tax_rate' ? '1' : '0.001'} value={it[k]} onChange={(e) => upd(i, k, e.target.value)} disabled={done} className="h-8 text-xs" />
            ))}
          </div>
        </div>
      ))}
      <label className="flex items-center gap-2"><input type="checkbox" checked={createPurchase} onChange={(e) => setCreatePurchase(e.target.checked)} disabled={done} /> {t('copilot.asPurchase')}</label>
      {createPurchase && (
        <div className="flex flex-wrap gap-2">
          {(['cash', 'credit'] as const).map((p) => (
            <Button key={p} size="sm" variant={payment === p ? 'default' : 'outline'} onClick={() => setPayment(p)} disabled={done}>
              {t(`copilot.${p}`)}
            </Button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <span className="text-xs text-muted-foreground">{t('copilot.total')}: <b className="text-foreground">{total.toFixed(3)} TND</b></span>
        <Button size="sm" onClick={commit} disabled={busy || done || !items.length} className={done ? 'bg-success text-success-foreground' : ''}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {done ? t('copilot.addedDone') : t('copilot.confirmAdd')}
        </Button>
      </div>
    </div>
  );
}
