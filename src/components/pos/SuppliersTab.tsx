import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Phone, MapPin, FileText, Trash2, Edit, Truck, Banknote } from 'lucide-react';
import { Supplier } from '@/hooks/useSuppliers';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface SuppliersTabProps {
  suppliers: Supplier[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddSupplier: (data: { name: string; phone?: string; address?: string; notes?: string }) => Promise<Supplier | null>;
  onUpdateSupplier: (id: string, updates: Partial<{ name: string; phone: string; address: string; notes: string }>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  onUpdateDebt: (id: string, amount: number) => Promise<void>;
  loading?: boolean;
}

export function SuppliersTab({
  suppliers, searchQuery, onSearchChange, onAddSupplier, onUpdateSupplier, onDeleteSupplier, onUpdateDebt, loading
}: SuppliersTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [debtSupplier, setDebtSupplier] = useState<Supplier | null>(null);
  const [debtAmount, setDebtAmount] = useState('');
  const [debtType, setDebtType] = useState<'add' | 'pay'>('add');
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });

  const resetForm = () => setForm({ name: '', phone: '', address: '', notes: '' });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const result = await onAddSupplier(form);
    if (result) { setShowAdd(false); resetForm(); }
  };

  const handleEdit = async () => {
    if (!editSupplier || !form.name.trim()) return;
    await onUpdateSupplier(editSupplier.id, form);
    setEditSupplier(null); resetForm();
  };

  const handleDebt = async () => {
    if (!debtSupplier || !debtAmount) return;
    const amount = parseFloat(debtAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onUpdateDebt(debtSupplier.id, debtType === 'add' ? amount : -amount);
    setDebtSupplier(null); setDebtAmount('');
  };

  const totalDebt = suppliers.reduce((sum, s) => sum + s.debtBalance, 0);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 pb-32">
        <div className="flex items-center justify-between py-4">
          <h2 className="text-xl font-bold">الموردين</h2>
          <Button size="sm" onClick={() => { resetForm(); setShowAdd(true); }} className="gap-1">
            <Plus className="w-4 h-4" /> إضافة مورد
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <Truck className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{suppliers.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الموردين</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Banknote className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <p className="text-2xl font-bold">{totalDebt.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">إجمالي الديون</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الهاتف..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Suppliers List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا يوجد موردين بعد</div>
        ) : (
          <div className="space-y-3">
            {suppliers.map(supplier => (
              <Card key={supplier.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-base">{supplier.name}</h3>
                      {supplier.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {supplier.phone}
                        </p>
                      )}
                      {supplier.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {supplier.address}
                        </p>
                      )}
                      {supplier.notes && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" /> {supplier.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className={`text-lg font-bold ${supplier.debtBalance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {supplier.debtBalance.toFixed(3)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">رصيد الدين</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => { setDebtSupplier(supplier); setDebtType('add'); }}>
                      <Banknote className="w-3 h-3" /> دين جديد
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => { setDebtSupplier(supplier); setDebtType('pay'); }}>
                      <Banknote className="w-3 h-3" /> تسديد
                    </Button>
                    <Button size="sm" variant="ghost" className="px-2" onClick={() => { setForm({ name: supplier.name, phone: supplier.phone, address: supplier.address, notes: supplier.notes }); setEditSupplier(supplier); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="px-2 text-destructive" onClick={() => setDeleteId(supplier.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editSupplier} onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditSupplier(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editSupplier ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم المورد *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المورد" />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="رقم الهاتف" dir="ltr" />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="العنوان" />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات" rows={2} />
            </div>
            <Button className="w-full" onClick={editSupplier ? handleEdit : handleAdd}>
              {editSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Dialog */}
      <Dialog open={!!debtSupplier} onOpenChange={(open) => { if (!open) { setDebtSupplier(null); setDebtAmount(''); } }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>{debtType === 'add' ? 'إضافة دين' : 'تسديد دين'} - {debtSupplier?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">الرصيد الحالي: <span className="font-bold">{debtSupplier?.debtBalance.toFixed(3)}</span></p>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} placeholder="0.000" dir="ltr" step="0.001" />
            </div>
            <Button className="w-full" onClick={handleDebt} variant={debtType === 'pay' ? 'default' : 'destructive'}>
              {debtType === 'add' ? 'تسجيل الدين' : 'تسجيل التسديد'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={async () => { if (deleteId) { await onDeleteSupplier(deleteId); setDeleteId(null); } }}
        title="حذف المورد"
        description="هل أنت متأكد من حذف هذا المورد؟ لن يتم حذف المشتريات المرتبطة به."
      />
    </div>
  );
}
