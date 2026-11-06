import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { packSplitMargin } from '@/lib/subUnits';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SubUnitState {
  enabled: boolean;
  name: string;
  count: string;
  price: string;
  loose: string;
}

export const emptySubUnits: SubUnitState = { enabled: false, name: 'سيجارة', count: '20', price: '', loose: '0' };

export function subUnitsToProduct(s: SubUnitState) {
  const count = parseInt(s.count) || 0;
  const price = parseFloat(s.price.replace(',', '.')) || 0;
  const enabled = s.enabled && count > 0 && price > 0;
  return {
    hasSubUnits: enabled,
    subUnitName: s.name.trim() || 'سيجارة',
    subUnitsCount: count || 20,
    subUnitPrice: enabled ? price : undefined,
    looseStock: enabled ? Math.max(0, Math.min(count - 1, parseFloat(s.loose.replace(',', '.')) || 0)) : 0,
  };
}

export function SubUnitFields({ value, onChange, packPrice, unit }: {
  value: SubUnitState; onChange: (v: SubUnitState) => void; packPrice: number; unit: string;
}) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const count = parseInt(value.count) || 0;
  const price = parseFloat(value.price.replace(',', '.')) || 0;
  const margin = count > 0 && price > 0 && packPrice > 0 ? packSplitMargin(packPrice, count, price) : null;
  const set = (k: keyof SubUnitState, v: string | boolean) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="subUnitsEnabled">{fr ? 'Vente au détail (pièce)' : 'البيع بالتجزئة (بالقطعة)'}</Label>
          <p className="text-xs text-muted-foreground">
            {fr ? `Vendre le ${unit} entier ou à la pièce` : `بيع ${unit} كاملة أو قطعة قطعة`}
          </p>
        </div>
        <Switch id="subUnitsEnabled" checked={value.enabled} onCheckedChange={(c) => set('enabled', c)} />
      </div>
      {value.enabled && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{fr ? 'Nom pièce' : 'اسم القطعة'}</Label>
              <Input value={value.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{fr ? 'Pièces / paquet' : 'عدد القطع'}</Label>
              <Input inputMode="numeric" dir="ltr" value={value.count} onChange={(e) => set('count', e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{fr ? 'Prix pièce' : 'سعر القطعة'}</Label>
              <Input inputMode="decimal" dir="ltr" placeholder="0.300" value={value.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{fr ? 'Pièces dans le paquet ouvert' : 'قطع متبقية في العلبة المفتوحة'}</Label>
            <Input inputMode="numeric" dir="ltr" value={value.loose} onChange={(e) => set('loose', e.target.value.replace(/\D/g, ''))} />
          </div>
          {margin !== null && (
            <p className={`text-xs font-bold ${margin >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fr
                ? `${count} × ${price.toFixed(3)} = ${(count * price).toFixed(3)} DT (écart ${margin.toFixed(3)} DT vs paquet)`
                : `${count} × ${price.toFixed(3)} = ${(count * price).toFixed(3)} د.ت (فارق ${margin.toFixed(3)} د.ت عن سعر العلبة)`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
