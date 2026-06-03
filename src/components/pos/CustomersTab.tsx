import { Users, Plus, Phone, Award, CreditCard, AlertTriangle, History, MessageCircle, QrCode } from 'lucide-react';
import { Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { useState, useMemo } from 'react';
import { PointsHistoryDialog } from './PointsHistoryDialog';
import { CustomerProfileDialog } from './CustomerProfileDialog';
import { LoyaltyCardDialog } from './LoyaltyCardDialog';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const [filterOverdue, setFilterOverdue] = useState(false);

  const displayed = useMemo(() => {
    if (!filterOverdue) return customers;
    return customers.filter(c => c.creditLimit > 0 && c.creditBalance >= c.creditLimit * 0.8);
  }, [customers, filterOverdue]);

  const totalDebt = customers.reduce((s, c) => s + c.creditBalance, 0);
  const overdueCount = customers.filter(c => c.creditLimit > 0 && c.creditBalance >= c.creditLimit * 0.8).length;

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    await onAddCustomer(form);
    setForm({ name: '', phone: '', email: '', address: '', creditLimit: 0 });
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <SearchBar value={searchQuery} onChange={onSearchChange} placeholder={t('common.search') + '...'} />

        <div className="grid grid-cols-3 gap-2">
          <div className="pos-card text-center p-2">
            <p className="text-xl font-bold text-primary">{customers.length}</p>
            <p className="text-xs text-muted-foreground">عميل</p>
          </div>
          <div className="pos-card text-center p-2">
            <p className="text-xl font-bold text-success">{customers.reduce((s, c) => s + c.points, 0)}</p>
            <p className="text-xs text-muted-foreground">نقاط</p>
          </div>
          <div className="pos-card text-center p-2">
            <p className="text-xl font-bold text-warning">{totalDebt.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">دين {CURRENCY}</p>
          </div>
        </div>

        {overdueCount > 0 && (
          <button
            onClick={() => setFilterOverdue(!filterOverdue)}
            className={`w-full p-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              filterOverdue ? 'bg-destructive text-destructive-foreground' : 'bg-destructive/10 text-destructive'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {filterOverdue ? `إظهار الجميع` : `${overdueCount} عميل قارب أو تجاوز الحد الائتماني`}
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
          <input className="pos-input" type="number" step="0.001" placeholder={`الحد الائتماني (${CURRENCY}) - اتركه 0 للسماح غير المحدود`}
                 value={form.creditLimit || ''} onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />
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
          return (
            <div
              key={customer.id}
              className={`pos-card cursor-pointer hover:shadow-md transition-shadow ${overLimit ? 'border-destructive' : nearLimit ? 'border-warning' : ''}`}
              onClick={() => setProfileCustomer(customer)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{customer.name}</h4>
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

                <button
                  onClick={(e) => { e.stopPropagation(); setLoyaltyCustomer(customer); }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                  title="بطاقة الولاء"
                >
                  <QrCode className="w-5 h-5 text-primary" />
                </button>

                {onFetchPointsHistory && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setHistoryCustomer(customer); }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                    title={t('customers.pointsHistory')}
                  >
                    <History className="w-5 h-5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {displayed.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{filterOverdue ? 'لا توجد ديون متأخرة' : t('customers.noCustomers')}</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-24 left-4 flex gap-3 z-40">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg flex items-center justify-center"
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
