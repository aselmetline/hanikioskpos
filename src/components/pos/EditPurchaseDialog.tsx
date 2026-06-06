import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Minus, Trash2, Save, Search } from 'lucide-react';
import { Product, Purchase, PurchaseItem } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase | null;
  products: Product[];
  suppliers: Supplier[];
  onSave: (id: string, items: PurchaseItem[], invoiceDate: Date, supplierId?: string) => Promise<boolean>;
}

export const EditPurchaseDialog: React.FC<Props> = ({ open, onOpenChange, purchase, products, suppliers, onSave }) => {
  const { t } = useLanguage();
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [date, setDate] = useState('');
  const [supplierId, setSupplierId] = useState<string>('none');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (purchase && open) {
      setItems(purchase.items.map(i => ({ ...i })));
      setDate(format(new Date(purchase.invoiceDate), 'yyyy-MM-dd'));
      setSupplierId(purchase.supplierId || 'none');
      setSearch('');
    }
  }, [purchase, open]);

  const total = useMemo(() => items.reduce((s, i) => s + i.total, 0), [items]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.nameAr?.includes(search) || p.barcode?.includes(search)
  );

  const addItem = (p: Product) => {
    const idx = items.findIndex(i => i.product.id === p.id);
    const cost = p.cost || p.price * 0.7;
    if (idx >= 0) {
      const next = [...items];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1, total: (next[idx].quantity + 1) * next[idx].cost };
      setItems(next);
    } else {
      setItems([...items, { product: p, cost, quantity: 1, total: cost }]);
    }
    setSearch(''); setShowSearch(false);
  };
  const updateQty = (pid: string, q: number) => {
    if (q <= 0) { setItems(items.filter(i => i.product.id !== pid)); return; }
    setItems(items.map(i => i.product.id === pid ? { ...i, quantity: q, total: i.cost * q } : i));
  };
  const updateCost = (pid: string, c: number) => {
    setItems(items.map(i => i.product.id === pid ? { ...i, cost: c, total: c * i.quantity } : i));
  };
  const remove = (pid: string) => setItems(items.filter(i => i.product.id !== pid));

  const handleSave = async () => {
    if (!purchase) return;
    if (items.length === 0) { toast.error(t('purchases.addItem')); return; }
    setSaving(true);
    const ok = await onSave(
      purchase.id,
      items,
      new Date(date),
      supplierId && supplierId !== 'none' ? supplierId : undefined
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  if (!purchase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t('common.edit') || 'تعديل'} — #{purchase.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t('purchases.invoiceDate')}</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} dir="ltr" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">{t('common.supplier')}</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('purchases.noSupplier')}</SelectItem>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSearch(e.target.value.length > 0); }}
              placeholder={t('sell.searchProduct')}
              className="pr-9 text-right"
            />
            {showSearch && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
                {filteredProducts.slice(0, 8).map(p => (
                  <button key={p.id} onClick={() => addItem(p)} className="w-full p-2 text-right hover:bg-muted flex justify-between items-center border-b last:border-0 text-sm">
                    <span className="text-muted-foreground">{(p.cost || p.price * 0.7).toFixed(3)}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center w-20 text-xs">{t('common.total')}</TableHead>
                  <TableHead className="text-center w-24 text-xs">{t('common.quantity')}</TableHead>
                  <TableHead className="text-center w-20 text-xs">{t('common.cost')}</TableHead>
                  <TableHead className="text-right text-xs">{t('common.product')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">{t('sell.noProducts')}</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.product.id}>
                    <TableCell className="text-center text-sm">{item.total.toFixed(3)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                        <Input type="number" value={item.quantity} onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)} className="w-12 text-center h-7 text-xs" dir="ltr" min="1" />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={item.cost} onChange={(e) => updateCost(item.product.id, parseFloat(e.target.value) || 0)} className="w-16 text-center h-7 text-xs" dir="ltr" step="0.001" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="truncate max-w-32 text-sm">{item.product.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(item.product.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground">
            ⚠️ {t('common.note') || 'ملاحظة'}: لن يتم تعديل المخزون أو ديون المورد تلقائياً. عدّلها يدوياً عند الحاجة.
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-lg font-bold">{total.toFixed(3)} TND</div>
            <Button onClick={handleSave} disabled={saving || items.length === 0} className="gap-1">
              <Save className="w-4 h-4" /> {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
