import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Supplier } from '@/hooks/useSuppliers';
import { useLanguage } from '@/contexts/LanguageContext';

interface Row { id: string; date: string; kind: 'purchase' | 'debt' | 'payment'; label: string; amount: number; balance?: number; cashbox?: boolean; }

export function SupplierStatementDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supplier) return;
    setLoading(true);
    (async () => {
      const [tx, pu] = await Promise.all([
        supabase.from('supplier_transactions').select('*').eq('supplier_id', supplier.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('purchases').select('id, invoice_number, invoice_date, total, created_at').eq('supplier_id', supplier.id).order('created_at', { ascending: false }).limit(500),
      ]);
      const list: Row[] = [
        ...(tx.data || []).map((r: any) => ({
          id: r.id, date: r.created_at, kind: r.type === 'debt' ? 'debt' as const : 'payment' as const,
          label: (r.type === 'debt' ? (ar ? 'دين جديد' : 'Nouvelle dette') : (ar ? 'دفعة' : 'Paiement')) + (r.notes ? ` — ${r.notes}` : ''),
          amount: Number(r.amount), balance: Number(r.balance_after), cashbox: r.from_cashbox,
        })),
        ...(pu.data || []).map((p: any) => ({
          id: p.id, date: p.created_at, kind: 'purchase' as const,
          label: `${ar ? 'فاتورة شراء' : 'Facture achat'} #${p.invoice_number}`, amount: Number(p.total),
        })),
      ].sort((a, b) => +new Date(b.date) - +new Date(a.date));
      setRows(list);
      setLoading(false);
    })();
  }, [supplier, ar]);

  const paid = rows.filter(r => r.kind === 'payment').reduce((s, r) => s + r.amount, 0);
  const purchases = rows.filter(r => r.kind === 'purchase').reduce((s, r) => s + r.amount, 0);

  return (
    <Dialog open={!!supplier} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{ar ? 'كشف حساب' : 'Relevé'} - {supplier?.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted p-2"><p className="font-bold">{purchases.toFixed(3)}</p><p>{ar ? 'المشتريات' : 'Achats'}</p></div>
          <div className="rounded-md bg-muted p-2"><p className="font-bold text-primary">{paid.toFixed(3)}</p><p>{ar ? 'المدفوع' : 'Payé'}</p></div>
          <div className="rounded-md bg-muted p-2"><p className="font-bold text-destructive">{supplier?.debtBalance.toFixed(3)}</p><p>{ar ? 'الدين الحالي' : 'Dette'}</p></div>
        </div>
        <ScrollArea className="max-h-[55vh]">
          {loading ? <p className="text-center py-6 text-muted-foreground">...</p> : rows.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">{ar ? 'لا توجد حركات' : 'Aucun mouvement'}</p>
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.kind + r.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.date).toLocaleString(ar ? 'ar-TN' : 'fr-TN')}
                      {r.cashbox ? (ar ? ' • من الصندوق' : ' • caisse') : ''}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={`font-bold ${r.kind === 'payment' ? 'text-primary' : 'text-destructive'}`}>
                      {r.kind === 'payment' ? '-' : '+'}{r.amount.toFixed(3)}
                    </p>
                    {r.balance !== undefined && <p className="text-[11px] text-muted-foreground">{ar ? 'الرصيد' : 'Solde'}: {r.balance.toFixed(3)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
