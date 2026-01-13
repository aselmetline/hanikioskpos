import { Users, Plus, Phone, Award, CreditCard, QrCode } from 'lucide-react';
import { Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { useState } from 'react';

interface CustomersTabProps {
  customers: Customer[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddCustomer: (customer: { name: string; phone: string }) => void;
}

export function CustomersTab({
  customers,
  searchQuery,
  onSearchChange,
  onAddCustomer
}: CustomersTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const handleAdd = () => {
    if (newName && newPhone) {
      onAddCustomer({ name: newName, phone: newPhone });
      setNewName('');
      setNewPhone('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-3">
        <SearchBar 
          value={searchQuery} 
          onChange={onSearchChange} 
          placeholder="بحث بالاسم أو الهاتف..."
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="pos-card text-center">
            <p className="text-2xl font-bold text-primary">{customers.length}</p>
            <p className="text-xs text-muted-foreground">عميل</p>
          </div>
          <div className="pos-card text-center">
            <p className="text-2xl font-bold text-success">
              {customers.reduce((sum, c) => sum + c.points, 0)}
            </p>
            <p className="text-xs text-muted-foreground">نقاط HaniWafa</p>
          </div>
          <div className="pos-card text-center">
            <p className="text-2xl font-bold text-warning">
              {customers.reduce((sum, c) => sum + c.creditBalance, 0).toFixed(0)}
            </p>
            <p className="text-xs text-muted-foreground">رصيد آجل</p>
          </div>
        </div>
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <div className="mx-4 mb-4 p-4 bg-card border-2 border-primary rounded-xl animate-scale-in">
          <h3 className="font-bold mb-3">إضافة عميل جديد</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم العميل"
              className="pos-input"
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="رقم الهاتف"
              className="pos-input"
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 pos-button-success">
                إضافة
              </button>
              <button 
                onClick={() => setShowAddForm(false)} 
                className="flex-1 pos-button-outline"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customers List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {customers.map((customer) => (
          <div key={customer.id} className="pos-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold">{customer.name}</h4>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{customer.phone}</span>
                </div>
              </div>
              
              <div className="text-left space-y-1">
                <div className="flex items-center gap-1 text-sm">
                  <Award className="w-4 h-4 text-success" />
                  <span className="font-bold text-success">{customer.points}</span>
                </div>
                {customer.creditBalance > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <CreditCard className="w-4 h-4 text-warning" />
                    <span className="font-bold text-warning">
                      {customer.creditBalance.toFixed(3)} {CURRENCY}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {customers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>لا يوجد عملاء</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-24 left-4 flex gap-3 z-40">
        <button 
          onClick={() => setShowAddForm(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button className="w-14 h-14 bg-secondary text-secondary-foreground rounded-2xl shadow-lg flex items-center justify-center">
          <QrCode className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
