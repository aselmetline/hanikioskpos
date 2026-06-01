import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  User, Phone, Mail, MapPin, Calendar, FileText, CreditCard, Award,
  ShoppingBag, Wallet, MessageCircle, Edit, Trash2, Plus, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { Customer, CustomerPayment } from '@/types/pos';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { CURRENCY } from '@/data/sampleData';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  storeName?: string;
  onUpdate: (id: string, updates: Partial<Customer>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onRecordPayment: (id: string, amount: number, method: string, notes?: string) => Promise<boolean>;
  onFetchPayments: (id: string) => Promise<CustomerPayment[]>;
  onFetchSales: (id: string) => Promise<any[]>;
}

type Tab = 'info' | 'sales' | 'debt' | 'points';

export function CustomerProfileDialog({
  open, onOpenChange, customer, storeName,
  onUpdate, onDelete, onRecordPayment, onFetchPayments, onFetchSales,
}: Props) {
  const { language, dir } = useLanguage();
  const locale = language === 'ar' ? ar : fr;
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Customer>(customer);
  const [showDelete, setShowDelete] = useState(false);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => { setForm(customer); }, [customer]);

  const loadPayments = useCallback(async () => {
    setPayments(await onFetchPayments(customer.id));
  }, [customer.id, onFetchPayments]);

  const loadSales = useCallback(async () => {
    setSales(await onFetchSales(customer.id));
  }, [customer.id, onFetchSales]);

  useEffect(() => {
    if (!open) return;
    if (tab === 'debt') loadPayments();
    if (tab === 'sales') loadSales();
  }, [open, tab, loadPayments, loadSales]);

  const handleSave = async () => {
    const ok = await onUpdate(customer.id, {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      birthday: form.birthday,
      notes: form.notes,
      creditLimit: Number(form.creditLimit) || 0,
    });
    if (ok) { toast.success('تم تحديث بيانات العميل'); setEditing(false); }
  };

  const handleDelete = async () => {
    const ok = await onDelete(customer.id);
    if (ok) { toast.success('تم حذف العميل'); onOpenChange(false); }
    setShowDelete(false);
  };

  const handleRecordPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    if (amt > customer.creditBalance) { toast.error('المبلغ أكبر من الدين المستحق'); return; }
    setSavingPayment(true);
    const ok = await onRecordPayment(customer.id, amt, 'cash', paymentNotes || undefined);
    setSavingPayment(false);
    if (ok) {
      toast.success(`تم تسجيل دفعة ${amt.toFixed(3)} ${CURRENCY}`);
      setPaymentAmount(''); setPaymentNotes('');
      await loadPayments();
    }
  };

  const sendStatementWhatsApp = () => {
    if (!customer.phone) { toast.error('لا يوجد رقم هاتف لهذا العميل'); return; }
    const lines = [
      `*كشف حساب - ${storeName || 'كشك هاني'}*`,
      ``,
      `العميل: ${customer.name}`,
      `الرصيد المستحق: ${customer.creditBalance.toFixed(3)} ${CURRENCY}`,
      `نقاط HaniWafa: ${customer.points}`,
      customer.creditLimit > 0 ? `الحد الائتماني: ${customer.creditLimit.toFixed(3)} ${CURRENCY}` : '',
      ``,
      `التاريخ: ${format(new Date(), 'dd/MM/yyyy')}`,
      `شكراً لتعاملكم معنا 🌟`,
    ].filter(Boolean).join('\n');
    const phone = customer.phone.replace(/\D/g, '');
    const url = `https://wa.me/${phone.startsWith('216') ? phone : '216' + phone}?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  const overLimit = customer.creditLimit > 0 && customer.creditBalance >= customer.creditLimit;
  const nearLimit = customer.creditLimit > 0 && customer.creditBalance >= customer.creditLimit * 0.8 && !overLimit;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0" dir={dir}>
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{customer.name}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  عميل منذ {format(customer.createdAt, 'dd MMM yyyy', { locale })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2 p-3 border-b">
            <div className="text-center p-2 rounded-lg bg-success/10">
              <Award className="w-4 h-4 mx-auto text-success" />
              <p className="text-lg font-bold text-success">{customer.points}</p>
              <p className="text-[10px] text-muted-foreground">نقاط</p>
            </div>
            <div className={`text-center p-2 rounded-lg ${overLimit ? 'bg-destructive/10' : nearLimit ? 'bg-warning/10' : 'bg-muted'}`}>
              <CreditCard className={`w-4 h-4 mx-auto ${overLimit ? 'text-destructive' : nearLimit ? 'text-warning' : 'text-muted-foreground'}`} />
              <p className={`text-lg font-bold ${overLimit ? 'text-destructive' : nearLimit ? 'text-warning' : ''}`}>
                {customer.creditBalance.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">دين {CURRENCY}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary/10">
              <Wallet className="w-4 h-4 mx-auto text-primary" />
              <p className="text-lg font-bold text-primary">{customer.creditLimit > 0 ? customer.creditLimit.toFixed(0) : '∞'}</p>
              <p className="text-[10px] text-muted-foreground">سقف الدين</p>
            </div>
          </div>

          {(overLimit || nearLimit) && (
            <div className={`mx-3 mt-2 p-2 rounded-lg flex items-center gap-2 text-xs ${overLimit ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
              <AlertTriangle className="w-4 h-4" />
              {overLimit ? 'تم تجاوز الحد الائتماني - لا يمكن البيع بالآجل' : 'العميل قارب على بلوغ الحد الائتماني'}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b">
            {([
              { id: 'info', label: 'البيانات' },
              { id: 'debt', label: 'الديون' },
              { id: 'sales', label: 'المشتريات' },
            ] as { id: Tab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                }`}
              >{t.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {tab === 'info' && (
              <div className="space-y-3">
                {editing ? (
                  <>
                    <Field icon={<User className="w-4 h-4" />} label="الاسم">
                      <input className="pos-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </Field>
                    <Field icon={<Phone className="w-4 h-4" />} label="الهاتف">
                      <input className="pos-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </Field>
                    <Field icon={<Mail className="w-4 h-4" />} label="البريد الإلكتروني">
                      <input className="pos-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </Field>
                    <Field icon={<MapPin className="w-4 h-4" />} label="العنوان">
                      <input className="pos-input" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
                    </Field>
                    <Field icon={<Calendar className="w-4 h-4" />} label="تاريخ الميلاد">
                      <input type="date" className="pos-input" value={form.birthday || ''} onChange={e => setForm({ ...form, birthday: e.target.value })} />
                    </Field>
                    <Field icon={<CreditCard className="w-4 h-4" />} label={`الحد الائتماني (${CURRENCY}) - 0 = بلا حد`}>
                      <input type="number" step="0.001" className="pos-input" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />
                    </Field>
                    <Field icon={<FileText className="w-4 h-4" />} label="ملاحظات">
                      <textarea className="pos-input min-h-[60px]" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </Field>
                    <div className="flex gap-2">
                      <button onClick={handleSave} className="flex-1 pos-button-success">حفظ</button>
                      <button onClick={() => { setEditing(false); setForm(customer); }} className="flex-1 pos-button-outline">إلغاء</button>
                    </div>
                  </>
                ) : (
                  <>
                    <InfoRow icon={<Phone className="w-4 h-4" />} label="الهاتف" value={customer.phone || '—'} />
                    <InfoRow icon={<Mail className="w-4 h-4" />} label="البريد" value={customer.email || '—'} />
                    <InfoRow icon={<MapPin className="w-4 h-4" />} label="العنوان" value={customer.address || '—'} />
                    <InfoRow icon={<Calendar className="w-4 h-4" />} label="تاريخ الميلاد" value={customer.birthday ? format(new Date(customer.birthday), 'dd MMM yyyy', { locale }) : '—'} />
                    <InfoRow icon={<CreditCard className="w-4 h-4" />} label="الحد الائتماني" value={customer.creditLimit > 0 ? `${customer.creditLimit.toFixed(3)} ${CURRENCY}` : 'غير محدد'} />
                    <InfoRow icon={<FileText className="w-4 h-4" />} label="ملاحظات" value={customer.notes || '—'} />
                  </>
                )}
              </div>
            )}

            {tab === 'debt' && (
              <div className="space-y-3">
                {customer.creditBalance > 0 && (
                  <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 space-y-2">
                    <h4 className="text-sm font-bold flex items-center gap-1">
                      <Plus className="w-4 h-4" /> تسجيل دفعة
                    </h4>
                    <input type="number" step="0.001" placeholder={`المبلغ (${CURRENCY})`} className="pos-input" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                    <input placeholder="ملاحظات (اختياري)" className="pos-input" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
                    <button onClick={handleRecordPayment} disabled={savingPayment} className="w-full pos-button-success">
                      {savingPayment ? '...' : 'تسديد'}
                    </button>
                  </div>
                )}
                <h4 className="text-sm font-bold text-muted-foreground">سجل الدفعات</h4>
                {payments.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">لا توجد دفعات سابقة</p>
                ) : payments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border">
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.notes || 'تسديد دين'}</p>
                      <p className="text-xs text-muted-foreground">{format(p.createdAt, 'dd MMM yyyy - HH:mm', { locale })}</p>
                    </div>
                    <span className="font-bold text-success">+{p.amount.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'sales' && (
              <div className="space-y-2">
                {sales.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">لا توجد مشتريات</p>
                ) : sales.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.payment_method === 'credit' ? 'بيع آجل' : 'بيع نقدي'}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'dd MMM yyyy - HH:mm', { locale })}</p>
                    </div>
                    <span className="font-bold">{Number(s.total).toFixed(3)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t p-3 flex gap-2 flex-wrap">
            {!editing && (
              <>
                <button onClick={() => setEditing(true)} className="flex-1 pos-button-outline flex items-center justify-center gap-1">
                  <Edit className="w-4 h-4" /> تعديل
                </button>
                <button onClick={sendStatementWhatsApp} className="flex-1 pos-button-success flex items-center justify-center gap-1">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
                <button onClick={() => setShowDelete(true)} className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="حذف العميل"
        description={`هل أنت متأكد من حذف العميل ${customer.name}؟ سيتم فقدان جميع البيانات المرتبطة.`}
      />
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}
