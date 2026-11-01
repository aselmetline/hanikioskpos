import { useState } from 'react';
import { Sale, Purchase, Expense, Product, Customer } from '@/types/pos';
import { ReportsTab } from '@/components/pos/ReportsTab';
import { ProfitCenter } from './ProfitCenter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface Props {
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  products: Product[];
  customers: Customer[];
  supplierDebts: number;
  cashBalance: number;
}

export function ReportsWithProfit(p: Props) {
  const { language, dir } = useLanguage();
  const [view, setView] = useState<'general' | 'profit'>('general');
  const ar = language === 'ar';
  return (
    <div className="flex flex-col h-full" dir={dir}>
      <div className="flex gap-2 px-4 pt-4">
        <Button className="flex-1" variant={view === 'general' ? 'default' : 'outline'} onClick={() => setView('general')}>
          {ar ? 'التقرير العام' : 'Rapport général'}
        </Button>
        <Button className="flex-1" variant={view === 'profit' ? 'default' : 'outline'} onClick={() => setView('profit')}>
          {ar ? 'مركز الأرباح والزكاة' : 'Marges & Zakat'}
        </Button>
      </div>
      {view === 'general' ? (
        <ReportsTab sales={p.sales} purchases={p.purchases} expenses={p.expenses} />
      ) : (
        <div className="p-4 pb-24">
          <ProfitCenter sales={p.sales} products={p.products} customers={p.customers} supplierDebts={p.supplierDebts} cashBalance={p.cashBalance} />
        </div>
      )}
    </div>
  );
}
