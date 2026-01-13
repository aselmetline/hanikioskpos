import { BarChart3, TrendingUp, Banknote, CreditCard, Download, Share2 } from 'lucide-react';
import { Sale } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';

interface ReportsTabProps {
  sales: Sale[];
}

export function ReportsTab({ sales }: ReportsTabProps) {
  const todaySales = sales.filter(s => {
    const today = new Date();
    return s.createdAt.toDateString() === today.toDateString();
  });

  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
  const cashSales = todaySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const creditSales = todaySales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = todaySales.length;
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const handleExportPDF = () => {
    // Placeholder for PDF export
    alert('سيتم تصدير التقرير كـ PDF');
  };

  const handleShareWhatsApp = () => {
    const message = `📊 تقرير يومي - كشك هاني\n\n📅 التاريخ: ${new Date().toLocaleDateString('ar-TN')}\n\n💰 إجمالي المبيعات: ${totalSales.toFixed(3)} ${CURRENCY}\n💵 المبيعات النقدية: ${cashSales.toFixed(3)} ${CURRENCY}\n💳 المبيعات الآجلة: ${creditSales.toFixed(3)} ${CURRENCY}\n📝 عدد العمليات: ${totalTransactions}\n📈 متوسط الفاتورة: ${averageTicket.toFixed(3)} ${CURRENCY}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex flex-col h-full p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">التقرير اليومي</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('ar-TN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center"
          >
            <Download className="w-5 h-5 text-secondary-foreground" />
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="w-10 h-10 bg-[#25D366] rounded-xl flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="pos-card col-span-2 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-80">إجمالي المبيعات</p>
              <p className="text-3xl font-bold">{totalSales.toFixed(3)}</p>
              <p className="text-sm opacity-80">{CURRENCY}</p>
            </div>
          </div>
        </div>

        <div className="pos-card">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-success" />
            <span className="text-sm text-muted-foreground">نقدي</span>
          </div>
          <p className="text-2xl font-bold text-success">{cashSales.toFixed(3)}</p>
          <p className="text-xs text-muted-foreground">{CURRENCY}</p>
        </div>

        <div className="pos-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-warning" />
            <span className="text-sm text-muted-foreground">آجل</span>
          </div>
          <p className="text-2xl font-bold text-warning">{creditSales.toFixed(3)}</p>
          <p className="text-xs text-muted-foreground">{CURRENCY}</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="pos-card">
          <p className="text-sm text-muted-foreground mb-1">عدد العمليات</p>
          <p className="text-2xl font-bold">{totalTransactions}</p>
        </div>
        <div className="pos-card">
          <p className="text-sm text-muted-foreground mb-1">متوسط الفاتورة</p>
          <p className="text-2xl font-bold">{averageTicket.toFixed(3)}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="flex-1">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          آخر العمليات
        </h3>
        
        <div className="space-y-2 overflow-y-auto">
          {todaySales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>لا توجد مبيعات اليوم</p>
            </div>
          ) : (
            todaySales.slice(0, 10).map((sale) => (
              <div key={sale.id} className="pos-card py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{sale.items.length} منتج</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.createdAt.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-success">{sale.total.toFixed(3)} {CURRENCY}</p>
                    <p className={`text-xs ${sale.paymentMethod === 'cash' ? 'text-success' : 'text-warning'}`}>
                      {sale.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
