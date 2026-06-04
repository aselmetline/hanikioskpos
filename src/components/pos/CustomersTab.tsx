import {
  Users, Plus, Phone, Award, CreditCard, AlertTriangle, History, QrCode,
  MessageCircle, Cake, Crown, ArrowUpDown, Search as SearchIcon, TrendingUp,
} from 'lucide-react';
import { Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { useState, useMemo } from 'react';
import { PointsHistoryDialog } from './PointsHistoryDialog';
import { CustomerProfileDialog } from './CustomerProfileDialog';
import { LoyaltyCardDialog } from './LoyaltyCardDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import type { NewCustomerInput } from '@/hooks/useCustomers';

interface CustomersTabProps {
  customers: Customer[];
  searchQuery: string;
  storeName?: string;
  onSearchChange: (query: string) => void;
  onAddCustomer: (customer: NewCustomerInput) => Promise<void> | void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => Promise<boolean>;
  onDeleteCustomer: (id: string) => Promise<boolean>;
  onRecordPayment: (id: string, amount: number, method: string, notes?: string) => Promise<boolean>;
  onFetchPayments: (id: string) => Promise<any[]>;
  onFetchSales: (id: string) => Promise<any[]>;
  onFetchPointsHistory?: (customerId: string) => Promise<any[]>;
}

type Segment = 'all' | 'debt' | 'vip' | 'birthday';
type SortKey = 'recent' | 'name' | 'debt_desc' | 'points_desc';

const VIP_POINTS_THRESHOLD = 200;

const normalizePhone = (raw: string) => {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('216') ? digits : '216' + digits;
};

const daysUntilBirthday = (bday?: string): number | null => {
  if (!bday) return null;
  const d = new Date(bday);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
};

export function CustomersTab({
  customers, searchQuery, storeName,
  onSearchChange, onAddCustomer,
  onUpdateCustomer, onDeleteCustomer, onRecordPayment,
  onFetchPayments, onFetchSales, onFetchPointsHistory,
}: CustomersTabProps) {
  const { t } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewCustomerInput>({ name: '', phone: '', email: '', address: '', creditLimit: 0, openingDebtBalance: 0 });
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [profileCustomer, setProfileCustomer] = useState<Customer | null>(null);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null);
  const [segment, setSegment] = useState<Segment>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [showTop, setShowTop] = useState(false);

  // Search via local filter (kept for backward compat with parent's `customers`)
  const searched = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);

  const filtered = useMemo(() => {
    return searched.filter(c => {
      if (segment === 'debt') return c.creditBalance > 0;
      if (segment === 'vip') return c.points >= VIP_POINTS_THRESHOLD;
      if (segment === 'birthday') {
        const d = daysUntilBirthday(c.birthday);
        return d !== null && d <= 30;
      }
      return true;
    });
  }, [searched, segment]);

  const displayed = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case 'name': arr.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
      case 'debt_desc': arr.sort((a, b) => b.creditBalance - a.creditBalance); break;
      case 'points_desc': arr.sort((a, b) => b.points - a.points); break;
      default: arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return arr;
  }, [filtered, sortKey]);

  const totalDebt = customers.reduce((s, c) => s + c.creditBalance, 0);
  const overdueCount = customers.filter(c => c.creditLimit > 0 && c.creditBalance >= c.creditLimit * 0.8).length;
  const birthdayCount = customers.filter(c => {
    const d = daysUntilBirthday(c.birthday);
    return d !== null && d <= 30;
  }).length;
  const debtorsCount = customers.filter(c => c.creditBalance > 0).length;
  const vipCount = customers.filter(c => c.points >= VIP_POINTS_THRESHOLD).length;

  const topCustomers = useMemo(
    () => [...customers].sort((a, b) => b.points - a.points).slice(0, 3),
    [customers],
  );

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await onAddCustomer(form);
    setForm({ name: '', phone: '', email: '', address: '', creditLimit: 0, openingDebtBalance: 0 });
    setShowAddForm(false);
  };

  const handleCall = (e: React.MouseEvent, phone?: string) => {
    e.stopPropagation();
    if (!phone) { toast.error('لا يوجد رقم هاتف'); return; }
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    const phone = normalizePhone(c.phone || '');
    if (!phone) { toast.error('لا يوجد رقم هاتف'); return; }
    const text = c.creditBalance > 0
      ? `مرحبا ${c.name}، نذكّركم برصيد مستحق بقيمة ${c.creditBalance.toFixed(3)} ${CURRENCY} لدى ${storeName || 'كشك هاني'}. شكراً 🌟`
      : `مرحبا ${c.name}، شكراً لتعاملكم مع ${storeName || 'كشك هاني'}. رصيد نقاط HaniWafa: ${c.points} 🎁`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleBulkDebtReminder = () => {
    const debtors = customers.filter(c => c.creditBalance > 0 && c.phone);
    if (debtors.length === 0) { toast.error('لا يوجد مدينون بأرقام هواتف'); return; }
    toast.success(`جاري فتح ${debtors.length} محادثة واتساب...`);
    debtors.slice(0, 5).forEach((c, i) => {
      setTimeout(() => {
        const phone = normalizePhone(c.phone);
        const text = `مرحبا ${c.name}، نذكّركم برصيد مستحق ${c.creditBalance.toFixed(3)} ${CURRENCY} لدى ${storeName || 'كشك هاني'}. شكراً 🌟`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
      }, i * 400);
    });
    if (debtors.length > 5) {
      toast.message(`تم فتح أول 5 من ${debtors.length}. كرّر العملية للمتبقّين.`);
    }
  };

  const handleBirthdayWish = (e: React.MouseEvent, c: Customer) => {
    e.stopPropagation();
    const phone = normalizePhone(c.phone || '');
    if (!phone) { toast.error('لا يوجد رقم هاتف'); return; }
    const text = `🎂 كل عام وأنت بخير ${c.name}! تهانينا من ${storeName || 'كشك هاني'} 🎁`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const segmentChips: { id: Segment; label: string; count: number; icon: React.ReactNode; tone: string }[] = [
    { id: 'all', label: 'الكل', count: customers.length, icon: <Users className="w-3.5 h-3.5" />, tone: 'primary' },
    { id: 'debt', label: 'مدينون', count: debtorsCount, icon: <CreditCard className="w-3.5 h-3.5" />, tone: 'warning' },
    { id: 'vip', label: 'VIP', count: vipCount, icon: <Crown className="w-3.5 h-3.5" />, tone: 'success' },
    { id: 'birthday', label: 'أعياد ميلاد', count: birthdayCount, icon: <Cake className="w-3.5 h-3.5" />, tone: 'destructive' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <SearchBar value={searchQuery} onChange={onSearchChange} placeholder={t('common.search') + '...'} />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="pos-card text-center p-2">
            <p className="text-lg font-bold text-primary">{customers.length}</p>
            <p className="text-[10px] text-muted-foreground">عميل</p>
          </div>
          <div className="pos-card text-center p-2">
            <p className="text-lg font-bold text-success">{customers.reduce((s, c) => s + c.points, 0)}</p>
            <p className="text-[10px] text-muted-foreground">نقاط</p>
          </div>
          <div className="pos-card text-center p-2">
            <p className="text-lg font-bold text-warning">{totalDebt.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">دين {CURRENCY}</p>
          </div>
          <button onClick={() => setShowTop(s => !s)} className="pos-card text-center p-2 hover:bg-muted transition-colors">
            <p className="text-lg font-bold text-accent-foreground flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" />
            </p>
            <p className="text-[10px] text-muted-foreground">الأفضل</p>
          </button>
        </div>

        {/* Top customers panel */}
        {showTop && topCustomers.length > 0 && (
          <div className="pos-card p-3 space-y-2 animate-scale-in">
            <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-success" /> أعلى 3 عملاء بالنقاط
            </h4>
            {topCustomers.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setProfileCustomer(c)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-right"
              >
                <span className="w-6 h-6 rounded-full bg-success/15 text-success text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className="text-sm font-bold text-success">{c.points} نقطة</span>
              </button>
            ))}
          </div>
        )}

        {/* Segment chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {segmentChips.map(s => {
            const active = segment === s.id;
            const toneActive: Record<string, string> = {
              primary: 'bg-primary text-primary-foreground',
              warning: 'bg-warning text-warning-foreground',
              success: 'bg-success text-success-foreground',
              destructive: 'bg-destructive text-destructive-foreground',
            };
            const toneIdle: Record<string, string> = {
              primary: 'bg-primary/10 text-primary',
              warning: 'bg-warning/10 text-warning',
              success: 'bg-success/10 text-success',
              destructive: 'bg-destructive/10 text-destructive',
            };
            return (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active ? toneActive[s.tone] : toneIdle[s.tone]
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
                <span className={`px-1.5 rounded-full text-[10px] ${active ? 'bg-white/25' : 'bg-background/60'}`}>{s.count}</span>
              </button>
            );
          })}
        </div>

        {/* Sort + bulk actions */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <ArrowUpDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="pos-input text-xs pr-8 appearance-none"
            >
              <option value="recent">الأحدث أولاً</option>
              <option value="name">الاسم (أ-ي)</option>
              <option value="debt_desc">الأكثر ديناً</option>
              <option value="points_desc">الأكثر نقاطاً</option>
            </select>
          </div>
          {segment === 'debt' && debtorsCount > 0 && (
            <button
              onClick={handleBulkDebtReminder}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
              title="إرسال تذكير واتساب جماعي"
            >
              <MessageCircle className="w-4 h-4" /> تذكير جماعي
            </button>
          )}
        </div>

        {overdueCount > 0 && segment !== 'debt' && (
          <button
            onClick={() => setSegment('debt')}
            className="w-full p-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {overdueCount} عميل قارب أو تجاوز الحد الائتماني
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mx-4 mb-4 p-4 bg-card border-2 border-primary rounded-xl animate-scale-in space-y-2">
          <h3 className="font-bold mb-2">إضافة عميل جديد</h3>
          <input className="pos-input" placeholder="اسم العميل *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="pos-input" placeholder="رقم الهاتف" type="tel" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <input className="pos-input" placeholder="البريد الإلكتروني (اختياري)" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="pos-input" placeholder="العنوان (اختياري)" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} />
          <input className="pos-input" type="date" placeholder="تاريخ الميلاد" value={form.birthday || ''} onChange={e => setForm({ ...form, birthday: e.target.value })} />
          <input className="pos-input" type="number" step="0.001" placeholder={`الحد الائتماني (${CURRENCY}) - اتركه 0 للسماح غير المحدود`}
                 value={form.creditLimit || ''} onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />
          <input className="pos-input" type="number" step="0.001" placeholder={`رصيد دين افتتاحي (${CURRENCY}) - اتركه 0 إن لم يكن هناك دين سابق`}
                 value={form.openingDebtBalance || ''} onChange={e => setForm({ ...form, openingDebtBalance: parseFloat(e.target.value) || 0 })} />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 pos-button-success">إضافة</button>
            <button onClick={() => setShowAddForm(false)} className="flex-1 pos-button-outline">إلغاء</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {displayed.map((customer) => {
          const overLimit = customer.creditLimit > 0 && customer.creditBalance >= customer.creditLimit;
          const nearLimit = customer.creditLimit > 0 && customer.creditBalance >= customer.creditLimit * 0.8 && !overLimit;
          const bdayIn = daysUntilBirthday(customer.birthday);
          const isVip = customer.points >= VIP_POINTS_THRESHOLD;
          const isBirthdaySoon = bdayIn !== null && bdayIn <= 30;
          const isBirthdayToday = bdayIn === 0;

          return (
            <div
              key={customer.id}
              className={`pos-card cursor-pointer hover:shadow-md transition-all ${overLimit ? 'border-destructive' : nearLimit ? 'border-warning' : isBirthdayToday ? 'border-success' : ''}`}
              onClick={() => setProfileCustomer(customer)}
            >
              <div className="flex items-center gap-3">
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isVip ? 'bg-gradient-to-br from-success/30 to-primary/30' : 'bg-primary/10'}`}>
                  <Users className={`w-6 h-6 ${isVip ? 'text-success' : 'text-primary'}`} />
                  {isVip && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success text-success-foreground flex items-center justify-center">
                      <Crown className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold truncate">{customer.name}</h4>
                    {isBirthdaySoon && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isBirthdayToday ? 'bg-success text-success-foreground' : 'bg-destructive/10 text-destructive'}`}>
                        <Cake className="w-3 h-3" />
                        {isBirthdayToday ? 'اليوم!' : `${bdayIn} يوم`}
                      </span>
                    )}
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {overLimit && (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium mt-1">
                      <AlertTriangle className="w-3 h-3" /> تجاوز الحد الائتماني
                    </span>
                  )}
                </div>

                <div className="text-left space-y-1 shrink-0">
                  <div className="flex items-center gap-1 text-sm justify-end">
                    <Award className="w-4 h-4 text-success" />
                    <span className="font-bold text-success">{customer.points}</span>
                  </div>
                  {customer.creditBalance > 0 && (
                    <div className="flex items-center gap-1 text-sm justify-end">
                      <CreditCard className={`w-4 h-4 ${overLimit ? 'text-destructive' : 'text-warning'}`} />
                      <span className={`font-bold ${overLimit ? 'text-destructive' : 'text-warning'}`}>
                        {customer.creditBalance.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions row */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t">
                <button
                  onClick={(e) => handleCall(e, customer.phone)}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium disabled:opacity-40"
                  disabled={!customer.phone}
                  title="اتصال"
                >
                  <Phone className="w-3.5 h-3.5" /> اتصال
                </button>
                <button
                  onClick={(e) => handleWhatsApp(e, customer)}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-xs font-medium disabled:opacity-40"
                  disabled={!customer.phone}
                  title="واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> واتساب
                </button>
                {isBirthdaySoon && customer.phone && (
                  <button
                    onClick={(e) => handleBirthdayWish(e, customer)}
                    className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    title="تهنئة عيد ميلاد"
                  >
                    <Cake className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setLoyaltyCustomer(customer); }}
                  className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                  title="بطاقة الولاء"
                >
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                </button>
                {onFetchPointsHistory && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setHistoryCustomer(customer); }}
                    className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                    title={t('customers.pointsHistory')}
                  >
                    <History className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {displayed.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {segment === 'birthday' ? <Cake className="w-12 h-12 mx-auto mb-2 opacity-50" /> :
             segment === 'vip' ? <Crown className="w-12 h-12 mx-auto mb-2 opacity-50" /> :
             segment === 'debt' ? <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" /> :
             searchQuery ? <SearchIcon className="w-12 h-12 mx-auto mb-2 opacity-50" /> :
             <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />}
            <p>
              {segment === 'birthday' ? 'لا أعياد ميلاد خلال 30 يوم' :
               segment === 'vip' ? `لا عملاء VIP بعد (≥ ${VIP_POINTS_THRESHOLD} نقطة)` :
               segment === 'debt' ? 'لا مدينون حالياً 🎉' :
               t('customers.noCustomers')}
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-24 left-4 flex gap-3 z-40">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="إضافة عميل"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {onFetchPointsHistory && historyCustomer && (
        <PointsHistoryDialog
          open={!!historyCustomer}
          onOpenChange={(open) => !open && setHistoryCustomer(null)}
          customerName={historyCustomer.name}
          customerId={historyCustomer.id}
          onFetchHistory={onFetchPointsHistory}
        />
      )}

      {profileCustomer && (
        <CustomerProfileDialog
          open={!!profileCustomer}
          onOpenChange={(open) => !open && setProfileCustomer(null)}
          customer={profileCustomer}
          storeName={storeName}
          onUpdate={onUpdateCustomer}
          onDelete={onDeleteCustomer}
          onRecordPayment={onRecordPayment}
          onFetchPayments={onFetchPayments}
          onFetchSales={onFetchSales}
        />
      )}

      {loyaltyCustomer && (
        <LoyaltyCardDialog
          open={!!loyaltyCustomer}
          onOpenChange={(open) => !open && setLoyaltyCustomer(null)}
          customer={loyaltyCustomer}
          storeName={storeName}
        />
      )}
    </div>
  );
}
