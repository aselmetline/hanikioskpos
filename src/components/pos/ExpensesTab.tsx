import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Receipt, TrendingDown } from 'lucide-react';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES } from '@/types/pos';
import { format } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExpensesTabProps {
  expenses: Expense[];
  onAddExpense: (amount: number, category: ExpenseCategory, description: string, date?: Date) => void;
  onDeleteExpense: (id: string) => void;
  monthTotal: number;
  todayTotal: number;
}

export default function ExpensesTab({
  expenses,
  onAddExpense,
  onDeleteExpense,
  monthTotal,
  todayTotal,
}: ExpensesTabProps) {
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? fr : ar;
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteExpenseId) {
      onDeleteExpense(deleteExpenseId);
      setDeleteExpenseId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    onAddExpense(
      parseFloat(amount),
      category,
      description,
      new Date(expenseDate)
    );

    setAmount('');
    setDescription('');
    setCategory('other');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const getCategoryInfo = (cat: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find(c => c.id === cat) || EXPENSE_CATEGORIES[6];
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 pb-24">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-xs text-muted-foreground">{t('expenses.todayExpenses')}</p>
            <p className="text-xl font-bold text-destructive">{todayTotal.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">TND</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-4 text-center">
            <Receipt className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-xs text-muted-foreground">{t('expenses.monthExpenses')}</p>
            <p className="text-xl font-bold text-destructive">{monthTotal.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">TND</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Expense Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t('expenses.addExpense')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>{t('common.category')}</Label>
            <div className="grid grid-cols-4 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      category === cat.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-lg block">{cat.icon}</span>
                    <span className="text-xs">{t(`expenses.categories.${cat.id}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('common.amount')} (TND)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000"
                  className="text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t('common.date')}</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('common.description')} ({t('common.optional')})</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('common.notes') + '...'}
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              <Plus className="w-5 h-5 ml-2" />
              {t('expenses.addExpense')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('expenses.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('expenses.noExpenses')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t('common.category')}</TableHead>
                    <TableHead className="text-right">{t('common.description')}</TableHead>
                    <TableHead className="text-right">{t('common.amount')}</TableHead>
                    <TableHead className="text-right">{t('common.date')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => {
                    const catInfo = getCategoryInfo(expense.category);
                    return (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <span>{catInfo.icon}</span>
                            {t(`expenses.categories.${catInfo.id}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.description || '-'}
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          -{expense.amount.toFixed(3)} TND
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(expense.date), 'dd/MM', { locale: dateLocale })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteExpenseId(expense.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteExpenseId !== null}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        onConfirm={handleDeleteConfirm}
        title={t('expenses.expenseDeleted')}
        description={t('common.confirm') + '?'}
      />
    </div>
  );
}
