import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [items, setItems] = useState<StagedItem[]>(preview.items);
  const [createPurchase, setCreatePurchase] = useState(preview.create_purchase);
  const [payment, setPayment] = useState(preview.payment_method);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const upd = (i: number, k: keyof StagedItem, v: string) =>
    setItems((prev) => prev.map((it, j) => j === i ? { ...it, [k]: ['name', 'name_ar'].includes(k) ? v : Number(v) } : it));
  const total = items.reduce((a, it) => a + it.cost * it.stock, 0);

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
    toast.success('تمت الإضافة للمخزون');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2 text-sm">
      <div className="font-bold">معاينة المنتجات {preview.supplier_name ? `— ${preview.supplier_name}` : ''}</div>
      {items.map((it, i) => (
        <div key={i} className="rounded-lg bg-secondary/50 p-2 space-y-1">
          <div className="flex items-center gap-2">
            <Input value={it.name_ar} onChange={(e) => upd(i, 'name_ar', e.target.value)} disabled={done} className="h-8" />
            <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${it.product_id ? 'bg-warning/20' : 'bg-success/20'}`}>
              {it.product_id ? `تحديث (${it.existing?.stock ?? 0})` : 'جديد'}
            </span>
            {!done && <button onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="حذف"><Trash2 className="w-4 h-4 text-destructive" /></button>}
          </div>
          <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
            <span>الكمية</span><span>الشراء</span><span>البيع</span><span>TVA%</span>
            {(['stock', 'cost', 'price', 'tax_rate'] as const).map((k) => (
              <Input key={k} type="number" step="0.001" value={it[k]} onChange={(e) => upd(i, k, e.target.value)} disabled={done} className="h-8 text-xs" />
            ))}
          </div>
        </div>
      ))}
      <label className="flex items-center gap-2"><input type="checkbox" checked={createPurchase} onChange={(e) => setCreatePurchase(e.target.checked)} disabled={done} /> تسجيل كفاتورة شراء</label>
      {createPurchase && (
        <div className="flex gap-2">
          {(['cash', 'credit'] as const).map((p) => (
            <Button key={p} size="sm" variant={payment === p ? 'default' : 'outline'} onClick={() => setPayment(p)} disabled={done}>
              {p === 'cash' ? 'نقداً' : 'آجل (دين مورد)'}
            </Button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="font-bold">{total.toFixed(3)} د.ت</span>
        <Button size="sm" onClick={commit} disabled={busy || done || !items.length}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {done ? 'تمت الإضافة' : 'تأكيد وإضافة للمخزون'}
        </Button>
      </div>
    </div>
  );
}
