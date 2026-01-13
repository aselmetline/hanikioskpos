import { ShoppingCart, Package, Users, BarChart3, Settings } from 'lucide-react';

export type TabType = 'sell' | 'inventory' | 'customers' | 'reports' | 'settings';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  cartItemCount: number;
}

export function BottomNav({ activeTab, onTabChange, cartItemCount }: BottomNavProps) {
  const tabs = [
    { id: 'sell' as TabType, icon: ShoppingCart, label: 'بيع', labelFr: 'Vente' },
    { id: 'inventory' as TabType, icon: Package, label: 'مخزون', labelFr: 'Stock' },
    { id: 'customers' as TabType, icon: Users, label: 'عملاء', labelFr: 'Clients' },
    { id: 'reports' as TabType, icon: BarChart3, label: 'تقارير', labelFr: 'Rapports' },
    { id: 'settings' as TabType, icon: Settings, label: 'إعدادات', labelFr: 'Paramètres' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`pos-nav-item flex-1 relative ${isActive ? 'active' : 'text-muted-foreground'}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {tab.id === 'sell' && cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-success text-success-foreground rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse-success">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
