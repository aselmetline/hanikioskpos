import { useState } from 'react';
import { ChevronLeft, Calendar, FileText, BarChart3, Save } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface QueryItem {
  id: string;
  label: string;
  onClick?: () => void;
}

interface QuerySection {
  id: string;
  title: string;
  items: QueryItem[];
}

interface QueriesTabProps {
  onNavigateToReport?: (reportId: string, dateFrom: Date, dateTo: Date) => void;
}

export function QueriesTab({ onNavigateToReport }: QueriesTabProps) {
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const handleQueryClick = (queryId: string) => {
    onNavigateToReport?.(queryId, dateFrom, dateTo);
  };

  const sections: QuerySection[] = [
    {
      id: 'store',
      title: 'المتجر',
      items: [
        { id: 'store-activity', label: 'عرض حركة المتجر' },
        { id: 'store-activity-chart', label: 'عرض حركة المتجر - رسم بياني' },
      ],
    },
    {
      id: 'sales',
      title: 'المبيعات',
      items: [
        { id: 'sales-report', label: 'تقرير بالمبيعات' },
        { id: 'profits-report', label: 'تقارير الأرباح' },
        { id: 'sales-invoices', label: 'عرض فواتير المبيعات' },
        { id: 'discounts-report', label: 'تقرير بالخصومات' },
        { id: 'credit-invoices', label: 'تقرير بالفواتير الآجل' },
        { id: 'returns-sales', label: 'تقرير بالفواتير المرتجع-مبيعات' },
        { id: 'cancelled-sales', label: 'تقرير بفواتير المبيعات التي تم إلغاءها' },
        { id: 'price-offers', label: 'تقرير بعروض الأسعار' },
        { id: 'tax-by-item', label: 'إجمالي الضرائب حسب الصنف' },
        { id: 'tax-by-customer', label: 'إجمالي الضرائب حسب العميل' },
      ],
    },
    {
      id: 'customers',
      title: 'العملاء',
      items: [
        { id: 'customer-debts', label: 'ذمم العملاء' },
        { id: 'customer-account', label: 'كشف حساب عميل' },
        { id: 'customer-verification', label: 'تقرير مصادقة حساب العميل' },
        { id: 'customer-opening-balance', label: 'تقرير بحركة الرصيد الافتتاحي والنقد للعميل' },
        { id: 'customer-invoices', label: 'تقرير بالفواتير لعميل' },
        { id: 'customer-invoices-total', label: 'تقرير بالفواتير لعميل - إجمالي' },
        { id: 'customer-returns', label: 'تقرير بالفواتير المرتجع لعميل' },
        { id: 'customer-receipts', label: 'تقرير بسندات القبض لعميل' },
        { id: 'customer-payments', label: 'تقرير بسندات الصرف لعميل' },
        { id: 'customer-payment-tracking', label: 'تقرير بحركة التسديد لعميل' },
        { id: 'customer-items-total', label: 'تقرير إجمالي حسب الصنف لعميل' },
        { id: 'customer-payment-method', label: 'تقرير بحركة السداد للعملاء حسب طريقة الدفع' },
      ],
    },
    {
      id: 'purchases',
      title: 'المشتريات',
      items: [
        { id: 'purchases-report', label: 'تقرير بالمشتريات' },
        { id: 'purchases-invoices', label: 'عرض فواتير المشتريات' },
        { id: 'returns-purchases', label: 'تقرير بالفواتير المرتجع-مشتريات' },
        { id: 'cancelled-purchases', label: 'تقرير بفواتير المشتريات التي تم إلغاءها' },
        { id: 'purchase-orders', label: 'تقرير بطلبات الشراء' },
      ],
    },
    {
      id: 'suppliers',
      title: 'الموردين',
      items: [
        { id: 'supplier-balance', label: 'تقرير بالمتبقي للموردين' },
      ],
    },
    {
      id: 'cashbox',
      title: 'الصندوق',
      items: [
        { id: 'cashbox-activity', label: 'تقرير بحركة الصندوق' },
        { id: 'capital-report', label: 'تقرير رأس المال' },
        { id: 'zakat-calculation', label: 'حساب الزكاة' },
        { id: 'tax-declaration', label: 'تقرير بالإقرار الضريبي' },
        { id: 'tax-with-returns', label: 'تقرير بالإقرار الضريبي مع المرتجع' },
      ],
    },
    {
      id: 'expenses',
      title: 'المصروفات',
      items: [
        { id: 'expenses-report', label: 'تقرير بالمصروفات' },
        { id: 'expenses-by-account', label: 'تقرير بالمصروفات حسب الحساب' },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full p-4 pb-24" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-primary">الاستعلامات</h2>
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
          title="حفظ"
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
              {dateTo ? format(dateTo, "yyyy/MM/dd") : "إلى"}
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

        <span className="text-muted-foreground">إلى</span>

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
              {dateFrom ? format(dateFrom, "yyyy/MM/dd") : "من"}
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

        <span className="text-muted-foreground font-medium">للفترة من</span>
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
                      onClick={() => handleQueryClick(item.id)}
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
