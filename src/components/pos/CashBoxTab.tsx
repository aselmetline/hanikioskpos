import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wallet, Plus, Minus, Calendar, FileText, History } from 'lucide-react';
import { CashBoxTransaction, CashBoxSettings } from '@/types/pos';
import { format } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface CashBoxTabProps {
  balance: number;
  transactions: CashBoxTransaction[];
  settings: CashBoxSettings;
  onAddTransaction: (type: 'add' | 'deduct', amount: number, description: string) => void;
  onUpdateSettings: (settings: Partial<CashBoxSettings>) => void;
}

const CashBoxTab: React.FC<CashBoxTabProps> = ({
  balance,
  transactions,
  settings,
  onAddTransaction,
  onUpdateSettings,
}) => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? fr : ar;
  const [transactionType, setTransactionType] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    onAddTransaction(transactionType, numAmount, description || (transactionType === 'add' ? t('cashbox.deposit') : t('cashbox.withdrawal')));
    setAmount('');
    setDescription('');
  };

  const todayTransactions = transactions.filter(t => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(t.date) >= today;
  });

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="text-muted-foreground"
          >
            <History className="w-5 h-5 ml-1" />
            {t('cashbox.transactions')}
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{t('cashbox.title')}</h2>
            <Wallet className="w-6 h-6 text-primary" />
          </div>
        </div>

        {!showHistory ? (
          <div className="space-y-4">
            {/* Transaction Type */}
            <Card>
              <CardContent className="p-4">
                <RadioGroup
                  value={transactionType}
                  onValueChange={(v) => setTransactionType(v as 'add' | 'deduct')}
                  className="flex justify-center gap-8"
                >
                  <div className="flex items-center gap-2">
                    <Label htmlFor="add" className="cursor-pointer">{t('cashbox.addMoney')}</Label>
                    <RadioGroupItem value="add" id="add" className="border-success text-success" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="deduct" className="cursor-pointer">{t('cashbox.deductMoney')}</Label>
                    <RadioGroupItem value="deduct" id="deduct" />
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label className="text-right block">{t('common.amount')}</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="text-center text-2xl font-bold text-destructive h-14"
                dir="ltr"
              />
            </div>

            {/* Date */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-48 text-center"
                  dir="ltr"
                />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t('common.date')}</span>
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-right block">{t('common.description')}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('common.notes') + '...'}
                className="text-right"
              />
            </div>

            {/* Auto Settings */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.autoAddSales}
                    onCheckedChange={(checked) => onUpdateSettings({ autoAddSales: checked })}
                  />
                  <span className="text-sm">{t('cashbox.autoAddSales')}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.autoDeductPurchases}
                    onCheckedChange={(checked) => onUpdateSettings({ autoDeductPurchases: checked })}
                  />
                  <span className="text-sm">{t('cashbox.autoDeductPurchases')}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <Switch
                    checked={settings.autoDeductExpenses}
                    onCheckedChange={(checked) => onUpdateSettings({ autoDeductExpenses: checked })}
                  />
                  <span className="text-sm">{t('cashbox.autoDeductExpenses')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full h-14 text-lg"
              disabled={!amount || parseFloat(amount) <= 0}
            >
              {transactionType === 'add' ? (
                <>
                  <Plus className="w-5 h-5 ml-2" />
                  {t('cashbox.addMoney')}
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5 ml-2" />
                  {t('cashbox.deductMoney')}
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Transaction History */
          <div className="space-y-3">
            <h3 className="font-bold text-lg text-right">{t('cashbox.transactions')} - {t('common.today')}</h3>
            {todayTransactions.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('cashbox.noTransactions')}</p>
                </CardContent>
              </Card>
            ) : (
              todayTransactions.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className={`font-bold ${t.type === 'add' ? 'text-success' : 'text-destructive'}`}>
                      {t.type === 'add' ? '+' : '-'}{t.amount.toFixed(2)} د.ت
                    </span>
                    <div className="text-right">
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(t.date), 'HH:mm', { locale: dateLocale })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </ScrollArea>

      {/* Fixed Balance Footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="bg-muted rounded-lg px-6 py-3 min-w-32">
            <span className={`text-2xl font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {balance.toFixed(2)}
            </span>
          </div>
          <span className="text-lg font-bold">{t('cashbox.balance')}</span>
        </div>
      </div>
    </div>
  );
};

export default CashBoxTab;
