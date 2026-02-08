import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PointsTransaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
}

interface PointsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerId: string;
  onFetchHistory: (customerId: string) => Promise<PointsTransaction[]>;
}

export function PointsHistoryDialog({
  open,
  onOpenChange,
  customerName,
  customerId,
  onFetchHistory
}: PointsHistoryDialogProps) {
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      setLoading(true);
      onFetchHistory(customerId).then(data => {
        setTransactions(data);
        setLoading(false);
      });
    }
  }, [open, customerId, onFetchHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            سجل نقاط {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>لا توجد عمليات نقاط بعد</p>
            </div>
          ) : (
            transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {tx.type === 'earn' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {tx.description || (tx.type === 'earn' ? 'كسب نقاط' : 'استبدال نقاط')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                  </p>
                </div>
                <span className={`font-bold text-sm ${
                  tx.type === 'earn' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {tx.type === 'earn' ? '+' : '-'}{tx.points}
                </span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
