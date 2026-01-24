import { ShoppingCart, Package, Users, BarChart3, Settings, Wallet, ShoppingBag, Receipt } from 'lucide-react';

export type TabType = 'sell' | 'inventory' | 'purchases' | 'expenses' | 'customers' | 'reports' | 'cashbox' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  cartItemCount: number;
}

export function BottomNav({ activeTab, onTabChange, cartItemCount }: BottomNavProps) {
  const tabs = [
    { id: 'sell' as TabType, icon: ShoppingCart, label: 'بيع', labelFr: 'Vente' },
    { id: 'inventory' as TabType, icon: Package, label: 'مخزون', labelFr: 'Stock' },
    { id: 'purchases' as TabType, icon: ShoppingBag, label: 'مشتريات', labelFr: 'Achats' },
    { id: 'expenses' as TabType, icon: Receipt, label: 'مصروفات', labelFr: 'Dépenses' },
    { id: 'cashbox' as TabType, icon: Wallet, label: 'صندوق', labelFr: 'Caisse' },
    { id: 'customers' as TabType, icon: Users, label: 'عملاء', labelFr: 'Clients' },
    { id: 'reports' as TabType, icon: BarChart3, label: 'تقارير', labelFr: 'Rapports' },
    { id: 'settings' as TabType, icon: Settings, label: 'إعدادات', labelFr: 'Paramètres' },
  ];

  return (
    <nav className="sticky top-0 left-0 right-0 bg-card border-b border-border z-50">
      <div className="flex items-center justify-around py-2 px-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pos-nav-item flex-shrink-0 relative px-2 ${isActive ? 'active' : 'text-muted-foreground'}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === 'sell' && cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-success text-success-foreground rounded-full text-[9px] flex items-center justify-center font-bold animate-pulse-success">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
