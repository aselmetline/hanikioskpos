import { ShoppingCart, Package, Users, BarChart3, Settings, Wallet, ShoppingBag, Receipt, FileSearch, Truck, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/contexts/LanguageContext';
import type { TabType } from './BottomNav';

interface SideNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  cartItemCount: number;
}

export function SideNav({ activeTab, onTabChange, cartItemCount }: SideNavProps) {
  const t = useT();
  const tabs = [
    { id: 'sell' as TabType, icon: ShoppingCart, label: t('nav.sell') },
    { id: 'inventory' as TabType, icon: Package, label: t('nav.inventory') },
    { id: 'purchases' as TabType, icon: ShoppingBag, label: t('nav.purchases') },
    { id: 'expenses' as TabType, icon: Receipt, label: t('nav.expenses') },
    { id: 'cashbox' as TabType, icon: Wallet, label: t('nav.cashbox') },
    { id: 'customers' as TabType, icon: Users, label: t('nav.customers') },
    { id: 'suppliers' as TabType, icon: Truck, label: t('nav.suppliers') },
    { id: 'transfers' as TabType, icon: ArrowLeftRight, label: t('nav.transfers') },
    { id: 'reports' as TabType, icon: BarChart3, label: t('nav.reports') },
    { id: 'queries' as TabType, icon: FileSearch, label: t('nav.queries') },
    { id: 'settings' as TabType, icon: Settings, label: t('nav.settings') },
  ];

  return (
    <nav className="w-56 flex-shrink-0 bg-card border-e border-border h-[calc(100vh-3.25rem)] sticky top-[3.25rem] overflow-y-auto py-3 px-2">
      <div className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-start',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md font-bold'
                  : 'text-muted-foreground hover:bg-secondary'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.id === 'sell' && cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-success text-success-foreground rounded-full text-[9px] flex items-center justify-center font-bold px-1 shadow-sm">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </div>
              <span className="text-sm">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
