import { useMemo, useState } from 'react';
import {
  Calendar,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Search,
  Star,
  Store,
  TrendingUp,
  Users,
  ShoppingCart,
  Truck,
  Wallet,
  ArrowLeftRight,
  Receipt,
  LineChart,
  X,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  TransfersReport,
} from './reports';
import { useLanguage } from '@/contexts/LanguageContext';

interface QueryItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
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

const FAV_KEY = 'queries_favorites';

const startOfDay = (d: Date) => {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
};
const endOfDay = (d: Date) => {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
};

export function QueriesTab({
  sales = [],
  purchases = [],
  expenses = [],
  transactions = [],
  customers = [],
  cashBoxBalance = 0,
  suppliers = [],
  transfers = [],
  products = [],
}: QueriesTabProps) {
  const { t, dir, isRTL } = useLanguage();
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<string>('thisMonth');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const applyPreset = (key: string) => {
    const now = new Date();
    setPreset(key);
    switch (key) {
      case 'today':
        setDateFrom(now);
        setDateTo(now);
        break;
      case 'yesterday': {
        const y = subDays(now, 1);
        setDateFrom(y);
        setDateTo(y);
        break;
      }
      case 'last7':
        setDateFrom(subDays(now, 6));
        setDateTo(now);
        break;
      case 'thisMonth':
        setDateFrom(startOfMonth(now));
        setDateTo(now);
        break;
      case 'lastMonth': {
        const lm = subMonths(now, 1);
        setDateFrom(startOfMonth(lm));
        setDateTo(endOfMonth(lm));
        break;
      }
      case 'thisYear':
        setDateFrom(startOfYear(now));
        setDateTo(now);
        break;
      default:
        break;
    }
  };

  const sections: QuerySection[] = [
    {
      id: 'store',
      title: t('reports.storeActivity'),
      items: [
        { id: 'store-activity', label: t('reports.storeActivity'), icon: Store },
        { id: 'store-activity-chart', label: `${t('reports.storeActivity')} — ${t('reports.title')}`, icon: LineChart },
      ],
    },
    {
      id: 'sales',
      title: t('reports.sales'),
      items: [
        { id: 'sales-report', label: t('reports.sales'), icon: Receipt },
        { id: 'profits-report', label: t('reports.profits'), icon: TrendingUp },
      ],
    },
    {
      id: 'customers',
      title: t('customers.title'),
      items: [{ id: 'customer-debts', label: t('reports.customerDebts'), icon: Users }],
    },
    {
      id: 'purchases',
      title: t('reports.purchases'),
      items: [{ id: 'purchases-report', label: t('reports.purchases'), icon: ShoppingCart }],
    },
    {
      id: 'suppliers',
      title: t('suppliers.title'),
      items: [{ id: 'suppliers-report', label: t('reports.supplierDebts'), icon: Truck }],
    },
    {
      id: 'cashbox',
      title: t('cashbox.title'),
      items: [{ id: 'cashbox-activity', label: t('reports.cashBox'), icon: Wallet }],
    },
    {
      id: 'transfers',
      title: t('reports.transfers'),
      items: [{ id: 'transfers-report', label: t('reports.transfers'), icon: ArrowLeftRight }],
    },
    {
      id: 'expenses',
      title: t('reports.expenses'),
      items: [{ id: 'expenses-report', label: t('reports.expenses'), icon: BarChart3 }],
    },
  ];

  const allItems = sections.flatMap(s => s.items);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)) }))
      .filter(s => s.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, t]);

  const stats = useMemo(() => {
    const from = startOfDay(dateFrom);
    const to = endOfDay(dateTo);
    const inRange = (d: Date) => d >= from && d <= to;
    const salesTotal = sales.filter(s => inRange(new Date(s.createdAt))).reduce((sum, s) => sum + s.total, 0);
    const salesCount = sales.filter(s => inRange(new Date(s.createdAt))).length;
    const purchasesTotal = purchases
      .filter(p => inRange(new Date(p.invoiceDate ?? p.createdAt)))
      .reduce((sum, p) => sum + p.total, 0);
    const expensesTotal = expenses
      .filter(e => inRange(new Date(e.date ?? e.createdAt)))
      .reduce((sum, e) => sum + e.amount, 0);

    return { salesTotal, salesCount, purchasesTotal, expensesTotal };
  }, [sales, purchases, expenses, dateFrom, dateTo]);

  const fmt = (n: number) => `${n.toFixed(3)} ${t('common.currency') || 'د.ت'}`;

  const getReportTitle = (reportId: string): string =>
    allItems.find(i => i.id === reportId)?.label || t('reports.title');

  const renderReport = () => {
    switch (activeReport) {
      case 'store-activity':
        return <StoreActivityReport sales={sales} purchases={purchases} expenses={expenses} transactions={transactions} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'store-activity-chart':
        return <StoreActivityReport sales={sales} purchases={purchases} expenses={expenses} transactions={transactions} dateFrom={dateFrom} dateTo={dateTo} showChart />;
      case 'sales-report':
        return <SalesReport sales={sales} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'profits-report':
        return <ProfitsReport sales={sales} purchases={purchases} expenses={expenses} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'customer-debts':
        return <CustomerDebtsReport customers={customers} sales={sales} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'purchases-report':
        return <PurchasesReport purchases={purchases} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'suppliers-report':
        return <SuppliersReport suppliers={suppliers} purchases={purchases} />;
      case 'cashbox-activity':
        return <CashBoxReport transactions={transactions} balance={cashBoxBalance} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'transfers-report':
        return <TransfersReport transfers={transfers} products={products} dateFrom={dateFrom} dateTo={dateTo} />;
      case 'expenses-report':
        return <ExpensesReport expenses={expenses} dateFrom={dateFrom} dateTo={dateTo} />;
      default:
        return null;
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  if (activeReport) {
    return (
      <div className="flex flex-col h-full p-4 pb-24" dir={dir}>
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveReport(null)} className="shrink-0">
            <BackIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-primary">{getReportTitle(activeReport)}</h2>
            <p className="text-sm text-muted-foreground">
              {format(dateFrom, 'yyyy/MM/dd')} - {format(dateTo, 'yyyy/MM/dd')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite(activeReport)}
            aria-label={t('queries.favorites')}
          >
            <Star className={cn('h-5 w-5', favorites.includes(activeReport) && 'fill-warning text-warning')} />
          </Button>
        </div>

        <ScrollArea className="flex-1">{renderReport()}</ScrollArea>
      </div>
    );
  }

  const favoriteItems = allItems.filter(i => favorites.includes(i.id));

  const renderItemButton = (item: QueryItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => setActiveReport(item.id)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-start"
      >
        <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 font-medium">{item.label}</span>
        <Star
          role="button"
          tabIndex={0}
          onClick={e => {
            e.stopPropagation();
            toggleFavorite(item.id);
          }}
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground hover:text-warning',
            favorites.includes(item.id) && 'fill-warning text-warning'
          )}
        />
      </button>
    );
  };

  const presets = ['today', 'yesterday', 'last7', 'thisMonth', 'lastMonth', 'thisYear'];

  return (
    <div className="flex flex-col h-full p-4 pb-24" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-primary">{t('queries.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {allItems.length} {t('queries.reportsCount')}
          </p>
        </div>
        <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-primary" />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground start-3" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('queries.searchReports')}
          className="ps-9 pe-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground"
            aria-label={t('common.cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Period presets */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {presets.map(p => (
          <Badge
            key={p}
            variant={preset === p ? 'default' : 'outline'}
            className="cursor-pointer whitespace-nowrap px-3 py-1.5"
            onClick={() => applyPreset(p)}
          >
            {t(`queries.${p}`)}
          </Badge>
        ))}
      </div>

      {/* Custom date range */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {([['from', dateFrom, setDateFrom], ['to', dateTo, setDateTo]] as const).map(([key, value, setter]) => (
          <Popover key={key}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start font-normal bg-background">
                <Calendar className="me-2 h-4 w-4" />
                <span className="truncate">
                  {t(`common.${key}`)}: {format(value, 'yyyy/MM/dd')}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={value}
                onSelect={date => {
                  if (date) {
                    setter(date);
                    setPreset('custom');
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t('reports.sales')}</p>
            <p className="text-base font-bold text-primary">{fmt(stats.salesTotal)}</p>
            <p className="text-[11px] text-muted-foreground">{stats.salesCount} {t('reports.salesCount')}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{t('reports.purchases')}</p>
            <p className="text-base font-bold">{fmt(stats.purchasesTotal)}</p>
            <p className="text-[11px] text-muted-foreground">
              {t('reports.expenses')}: {fmt(stats.expensesTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sections */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          {!search && favoriteItems.length > 0 && (
            <div>
              <div className="bg-warning/10 px-4 py-2 rounded-t-lg border-s-4 border-warning flex items-center gap-2">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <h3 className="font-bold text-lg">{t('queries.favorites')}</h3>
              </div>
              <Card className="rounded-t-none border-t-0">
                <CardContent className="p-0 divide-y divide-border">
                  {favoriteItems.map(renderItemButton)}
                </CardContent>
              </Card>
            </div>
          )}

          {filteredSections.length === 0 && (
            <p className="text-center text-muted-foreground py-10">{t('queries.noResults')}</p>
          )}

          {filteredSections.map(section => (
            <div key={section.id}>
              <div className="bg-muted/80 px-4 py-2 rounded-t-lg border-s-4 border-primary">
                <h3 className="font-bold text-primary text-lg">{section.title}</h3>
              </div>
              <Card className="rounded-t-none border-t-0">
                <CardContent className="p-0 divide-y divide-border">
                  {section.items.map(renderItemButton)}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
