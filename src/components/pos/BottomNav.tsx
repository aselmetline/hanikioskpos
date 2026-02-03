import { ShoppingCart, Package, Users, BarChart3, Settings, Wallet, ShoppingBag, Receipt, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export type TabType = 'sell' | 'inventory' | 'purchases' | 'expenses' | 'customers' | 'reports' | 'queries' | 'cashbox' | 'settings';
interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  cartItemCount: number;
}

export function BottomNav({ activeTab, onTabChange, cartItemCount }: BottomNavProps) {
  const tabs = [
    { id: 'sell' as TabType, icon: ShoppingCart, label: 'بيع' },
    { id: 'inventory' as TabType, icon: Package, label: 'مخزون' },
    { id: 'purchases' as TabType, icon: ShoppingBag, label: 'مشتريات' },
    { id: 'expenses' as TabType, icon: Receipt, label: 'مصروفات' },
    { id: 'cashbox' as TabType, icon: Wallet, label: 'صندوق' },
    { id: 'customers' as TabType, icon: Users, label: 'عملاء' },
    { id: 'reports' as TabType, icon: BarChart3, label: 'تقارير' },
    { id: 'queries' as TabType, icon: FileSearch, label: 'استعلامات' },
    { id: 'settings' as TabType, icon: Settings, label: 'إعدادات' },
  ];

  return (
    <nav className="sticky top-0 left-0 right-0 bg-card border-b border-border z-50 shadow-sm">
      <ScrollArea className="w-full">
        <div className="flex items-center py-1.5 px-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] flex-shrink-0",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-secondary active:scale-95"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
                  {tab.id === 'sell' && cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-success text-success-foreground rounded-full text-[9px] flex items-center justify-center font-bold px-1 shadow-sm">
                      {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-tight",
                  isActive && "font-bold"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </nav>
  );
}
