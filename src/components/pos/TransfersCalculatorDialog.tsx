import { useMemo, useState } from 'react';
import { Calculator, Search, Check } from 'lucide-react';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useT } from '@/contexts/LanguageContext';

type Basis = 'cost' | 'market';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  /** Pre-selected source product id (from the transfer form). */
  defaultSourceId?: string;
  defaultQuantity?: number;
  /** Called when the user picks a computed target row. */
  onApply: (sourceId: string, quantity: number, targetId: string) => void;
}

const fmt = (n: number) => `${n.toFixed(3)} ${CURRENCY}`;

/** Unit value of a product for the selected valuation basis. */
function unitValue(p: Product, basis: Basis) {
  if (basis === 'market') return p.price || 0;
  return p.cost && p.cost > 0 ? p.cost : p.price || 0;
}

export function TransfersCalculatorDialog({
  open,
  onOpenChange,
  products,
  defaultSourceId = '',
  defaultQuantity = 1,
  onApply,
}: Props) {
  const t = useT();
  const [basis, setBasis] = useState<Basis>('cost');
  const [sourceId, setSourceId] = useState(defaultSourceId);
  const [quantity, setQuantity] = useState(String(defaultQuantity || 1));
  const [search, setSearch] = useState('');

  const source = products.find(p => p.id === sourceId);
  const qty = Math.floor(Number(quantity) || 0);
  const srcUnit = source ? unitValue(source, basis) : 0;
  const totalValue = Number((srcUnit * qty).toFixed(3));
  const srcMissingCost = !!source && basis === 'cost' && !(source.cost && source.cost > 0);

  const rows = useMemo(() => {
    if (!source || qty <= 0 || totalValue <= 0) return [];
    const q = search.trim().toLowerCase();
    return products
      .filter(p => p.id !== source.id)
      .filter(p => !q || `${p.nameAr} ${p.name}`.toLowerCase().includes(q))
      .map(p => {
        const unit = unitValue(p, basis);
        if (unit <= 0) return null;
        const targetQty = Math.floor(totalValue / unit);
        if (targetQty <= 0) return null;
        return {
          product: p,
          unit,
          targetQty,
          remainder: Number((totalValue - targetQty * unit).toFixed(3)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.remainder - b!.remainder || b!.targetQty - a!.targetQty)
      .slice(0, 50) as {
      product: Product;
      unit: number;
      targetQty: number;
      remainder: number;
    }[];
  }, [products, source, qty, totalValue, basis, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            {t('transfers.calcTitle')}
          </DialogTitle>
          <DialogDescription>{t('transfers.calcSubtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('transfers.source')}</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger><SelectValue placeholder={t('transfers.selectProduct')} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {(p.nameAr || p.name)} — {fmt(unitValue(p, basis))} ({t('transfers.available')}: {p.stock})
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
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t('transfers.basis')}</Label>
            <Select value={basis} onValueChange={v => setBasis(v as Basis)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">{t('transfers.basisCost')}</SelectItem>
                <SelectItem value="market">{t('transfers.basisMarket')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('transfers.basisNote')}</p>
          </div>

          {source && qty > 0 && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('transfers.sourceUnitValue')}</span>
                <span className="font-medium">{fmt(srcUnit)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('transfers.sourceValue')}</span>
                <span className="font-bold text-primary">{fmt(totalValue)}</span>
              </div>
              {srcMissingCost && (
                <p className="text-xs text-warning">{t('transfers.noCost')}</p>
              )}
              {qty > source.stock && (
                <p className="text-xs text-destructive">{t('transfers.insufficientStock')}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm">{t('transfers.candidates')}</h4>
              <div className="relative w-44">
                <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="ps-8 h-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('transfers.searchTarget')}
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('transfers.noCandidates')}</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
                {rows.map(r => (
                  <div
                    key={r.product.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{r.product.nameAr || r.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('transfers.targetUnitPrice')}: {fmt(r.unit)} · {t('transfers.remainder')}: {fmt(r.remainder)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="font-bold">
                        {r.targetQty} ×
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          onApply(source!.id, qty, r.product.id);
                          onOpenChange(false);
                        }}
                      >
                        <Check className="w-4 h-4 me-1" />
                        {t('transfers.apply')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
