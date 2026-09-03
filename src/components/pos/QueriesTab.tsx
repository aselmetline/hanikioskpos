import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, BarChart3, Save, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Sale, Purchase, Expense, CashBoxTransaction, Customer, Product } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import type { InternalTransfer } from '@/hooks/useInternalTransfers';
import {
  SalesReport,
  ProfitsReport,
  CustomerDebtsReport,
  PurchasesReport,
  ExpensesReport,
  CashBoxReport,
  StoreActivityReport,
  SuppliersReport,
  TransfersReport
} from './reports';
import { useLanguage } from '@/contexts/LanguageContext';

interface QueryItem {
  id: string;
  label: string;
}

interface QuerySection {
  id: string;
  title: string;
  items: QueryItem[];
}

interface QueriesTabProps {
  sales?: Sale[];
  purchases?: Purchase[];
  expenses?: Expense[];
  transactions?: CashBoxTransaction[];
  customers?: Customer[];
  cashBoxBalance?: number;
  suppliers?: Supplier[];
  transfers?: InternalTransfer[];
  products?: Product[];
}

export function QueriesTab({ 
  sales = [], 
  purchases = [], 
  expenses = [], 
  transactions = [],
  customers = [],
  cashBoxBalance = 0,
  suppliers = [],
  transfers = [],
  products = []
}: QueriesTabProps) {
  const { t } = useLanguage();
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const sections: QuerySection[] = [
    {
      id: 'store',
      title: t('reports.storeActivity'),
      items: [
        { id: 'store-activity', label: t('reports.storeActivity') },
        { id: 'store-activity-chart', label: t('reports.storeActivity') + ' - ' + t('reports.title') },
      ],
    },
    {
      id: 'sales',
      title: t('reports.sales'),
      items: [
        { id: 'sales-report', label: t('reports.sales') },
        { id: 'profits-report', label: t('reports.profits') },
      ],
    },
    {
      id: 'customers',
      title: t('customers.title'),
      items: [
        { id: 'customer-debts', label: t('reports.customerDebts') },
      ],
    },
    {
      id: 'purchases',
      title: t('reports.purchases'),
      items: [
        { id: 'purchases-report', label: t('reports.purchases') },
      ],
    },
    {
      id: 'suppliers',
      title: t('suppliers.title'),
      items: [
        { id: 'suppliers-report', label: t('reports.supplierDebts') },
      ],
    },
    {
      id: 'cashbox',
      title: t('cashbox.title'),
      items: [
        { id: 'cashbox-activity', label: t('reports.cashBox') },
      ],
    },
    {
      id: 'transfers',
      title: t('reports.transfers'),
      items: [
        { id: 'transfers-report', label: t('reports.transfers') },
      ],
    },
    {
      id: 'expenses',
      title: t('reports.expenses'),
      items: [
        { id: 'expenses-report', label: t('reports.expenses') },
      ],
    },
  ];

  const getReportTitle = (reportId: string): string => {
    const allItems = sections.flatMap(s => s.items);
    return allItems.find(i => i.id === reportId)?.label || t('reports.title');
  };

  const renderReport = () => {
    switch (activeReport) {
      case 'store-activity':
        return (
          <StoreActivityReport
            sales={sales}
            purchases={purchases}
            expenses={expenses}
            transactions={transactions}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'store-activity-chart':
        return (
          <StoreActivityReport
            sales={sales}
            purchases={purchases}
            expenses={expenses}
            transactions={transactions}
            dateFrom={dateFrom}
            dateTo={dateTo}
            showChart
          />
        );
      case 'sales-report':
        return (
          <SalesReport
            sales={sales}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'profits-report':
        return (
          <ProfitsReport
            sales={sales}
            purchases={purchases}
            expenses={expenses}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'customer-debts':
        return (
          <CustomerDebtsReport
            customers={customers}
            sales={sales}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'purchases-report':
        return (
          <PurchasesReport
            purchases={purchases}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'suppliers-report':
        return (
          <SuppliersReport
            suppliers={suppliers}
            purchases={purchases}
          />
        );
      case 'cashbox-activity':
        return (
          <CashBoxReport
            transactions={transactions}
            balance={cashBoxBalance}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'transfers-report':
        return (
          <TransfersReport
            transfers={transfers}
            products={products}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      case 'expenses-report':
        return (
          <ExpensesReport
            expenses={expenses}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        );
      default:
        return null;
    }
  };

  if (activeReport) {
    return (
      <div className="flex flex-col h-full p-4 pb-24" dir="rtl">
        {/* Report Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveReport(null)}
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-primary">{getReportTitle(activeReport)}</h2>
            <p className="text-sm text-muted-foreground">
              {format(dateFrom, 'yyyy/MM/dd')} - {format(dateTo, 'yyyy/MM/dd')}
            </p>
          </div>
        </div>

        {/* Report Content */}
        <ScrollArea className="flex-1">
          {renderReport()}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 pb-24" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">{t('queries.title')}</h2>
        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center">
          <BarChart3 className="w-10 h-10 text-primary" />
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-3 mb-6 bg-muted/50 p-3 rounded-xl">
        <Button 
          variant="outline" 
          size="icon"
          className="h-10 w-10"
          title={t('common.save')}
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-right font-normal bg-background",
                !dateTo && "text-muted-foreground"
              )}
            >
              <Calendar className="ml-2 h-4 w-4" />
              {dateTo ? format(dateTo, "yyyy/MM/dd") : t('common.to')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateTo}
              onSelect={(date) => date && setDateTo(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">{t('common.to')}</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-right font-normal bg-background",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <Calendar className="ml-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "yyyy/MM/dd") : t('common.from')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateFrom}
              onSelect={(date) => date && setDateFrom(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground font-medium">{t('reports.period')}</span>
      </div>

      {/* Query Sections */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id}>
              {/* Section Header */}
              <div className="bg-muted/80 px-4 py-2 rounded-t-lg border-r-4 border-primary">
                <h3 className="font-bold text-primary text-lg">{section.title}</h3>
              </div>
              
              {/* Section Items */}
              <Card className="rounded-t-none border-t-0">
                <CardContent className="p-0 divide-y divide-border">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveReport(item.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-right"
                    >
                      <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      <span className="flex-1 text-foreground">{item.label}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default QueriesTab;
