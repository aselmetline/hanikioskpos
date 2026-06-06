import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Barcode, Save, Trash2, Plus, Minus, ShoppingBag, Receipt, Eye, ChevronDown, ChevronUp,
  PackagePlus, Wallet, TrendingUp, CalendarDays, Search, ArrowUpDown, Crown, X, BadgeDollarSign,
  Printer, Pencil, BarChart3,
} from 'lucide-react';
import { Product, PurchaseItem, Purchase } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { PurchaseReceiptPrinter } from './PurchaseReceiptPrinter';
import { AddProductDialog } from './AddProductDialog';
import { EditPurchaseDialog } from './EditPurchaseDialog';
import { PurchasesReportView } from './PurchasesReportView';
import { useLanguage } from '@/contexts/LanguageContext';


type PaymentMode = 'cash' | 'credit';
type SortKey = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc';

interface PurchasesTabProps {
  products: Product[];
  currentItems: PurchaseItem[];
  currentTotal: number;
  invoiceNumber: string;
  onSetInvoiceNumber: (num: string) => void;
  onAddItem: (product: Product, cost: number, quantity: number) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdateCost: (productId: string, cost: number) => void;
  onRemoveItem: (productId: string) => void;
  onSavePurchase: (invoiceDate: Date, supplierId?: string) => void;
  onUpdateStock: (productId: string, quantity: number, isAddition: boolean) => void;
  suppliers?: Supplier[];
  onUpdateSupplierDebt?: (id: string, amount: number) => Promise<void>;
  purchases?: Purchase[];
  onDeletePurchase?: (id: string) => Promise<void>;
  onUpdatePurchase?: (id: string, items: PurchaseItem[], invoiceDate: Date, supplierId?: string) => Promise<boolean>;

  onAddProduct?: (product: {
    name: string; nameAr: string; price: number; cost?: number; category: string;
    barcode?: string; stock: number; unit: string; lowStockAlert: number;
  }) => Promise<unknown>;
  kioskName?: string;
  kioskNameFr?: string;
  storePhone?: string;
  storeAddress?: string;
  commercialRegister?: string;
}

const PurchasesTab: React.FC<PurchasesTabProps> = ({
  products,
  currentItems,
  currentTotal,
  invoiceNumber,
  onSetInvoiceNumber,
  onAddItem,
  onUpdateQuantity,
  onUpdateCost,
  onRemoveItem,
  onSavePurchase,
  onUpdateStock,
  suppliers = [],
  onUpdateSupplierDebt,
  purchases = [],
  onDeletePurchase,
  onUpdatePurchase,
  onAddProduct,


  kioskName,
  kioskNameFr,
  storePhone,
  storeAddress,
  commercialRegister,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('credit');
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'new' | 'history' | 'reports'>('new');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [savedPurchaseData, setSavedPurchaseData] = useState<{ items: PurchaseItem[]; total: number; invoiceNumber: string; invoiceDate: Date; supplier?: Supplier } | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);


  // History filters
  const [histSearch, setHistSearch] = useState('');
  const [histSupplier, setHistSupplier] = useState<string>('all');
  const [histFrom, setHistFrom] = useState<string>('');
  const [histTo, setHistTo] = useState<string>('');
  const [histSort, setHistSort] = useState<SortKey>('date_desc');

  // Pay supplier debt mini-dialog
  const [payDebtOpen, setPayDebtOpen] = useState(false);
  const [payDebtAmount, setPayDebtAmount] = useState('');

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nameAr?.includes(searchQuery) ||
    p.barcode?.includes(searchQuery)
  );

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const handleSelectProduct = (product: Product) => {
    onAddItem(product, product.cost || product.price * 0.7, 1);
    setSearchQuery('');
    setShowProductSearch(false);
  };

  const handleSave = async () => {
    if (currentItems.length === 0) {
      toast.error(t('purchases.addItem'));
      return;
    }

    const savedItems = [...currentItems];
    const savedTotal = currentTotal;
    const savedInvNum = invoiceNumber;
    const savedDate = new Date(invoiceDate);
    const supplier = suppliers.find(s => s.id === selectedSupplierId);

    currentItems.forEach(item => {
      onUpdateStock(item.product.id, item.quantity, true);
    });

    // Only add to supplier debt when payment mode is credit
    if (selectedSupplierId && selectedSupplierId !== 'none' && paymentMode === 'credit' && onUpdateSupplierDebt) {
      await onUpdateSupplierDebt(selectedSupplierId, currentTotal);
    }

    onSavePurchase(new Date(invoiceDate), selectedSupplierId && selectedSupplierId !== 'none' ? selectedSupplierId : undefined);
    setSelectedSupplierId('');
    setPaymentMode('credit');

    setSavedPurchaseData({
      items: savedItems,
      total: savedTotal,
      invoiceNumber: savedInvNum,
      invoiceDate: savedDate,
      supplier,
    });
    setReceiptOpen(true);
  };

  const handlePayDebt = async () => {
    if (!selectedSupplier || !onUpdateSupplierDebt) return;
    const amt = parseFloat(payDebtAmount);
    if (!amt || amt <= 0) { toast.error(t('common.amount')); return; }
    if (amt > selectedSupplier.debtBalance) { toast.error(t('suppliers.debtBalance')); return; }
    await onUpdateSupplierDebt(selectedSupplier.id, -amt);
    toast.success(t('common.save'));
    setPayDebtAmount('');
    setPayDebtOpen(false);
  };

  // Stats
  const now = new Date();
  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalItems = purchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0);
  const monthPurchases = purchases.filter(p => isSameMonth(new Date(p.invoiceDate), now));
  const monthTotal = monthPurchases.reduce((s, p) => s + p.total, 0);
  const todayPurchases = purchases.filter(p => isSameDay(new Date(p.invoiceDate), now));
  const todayTotal = todayPurchases.reduce((s, p) => s + p.total, 0);

  const topSupplier = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    purchases.forEach(p => {
      if (!p.supplierName) return;
      const key = p.supplierId || p.supplierName;
      const cur = map.get(key) || { name: p.supplierName, total: 0, count: 0 };
      cur.total += p.total; cur.count += 1;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total)[0];
  }, [purchases]);

  const totalSupplierDebt = useMemo(() => suppliers.reduce((s, sp) => s + (sp.debtBalance || 0), 0), [suppliers]);

  // History filtering & sorting
  const filteredHistory = useMemo(() => {
    let list = [...purchases];
    if (histSearch.trim()) {
      const q = histSearch.toLowerCase();
      list = list.filter(p =>
        p.invoiceNumber.toLowerCase().includes(q) ||
        (p.supplierName || '').toLowerCase().includes(q) ||
        p.items.some(i => i.product.name.toLowerCase().includes(q))
      );
    }
    if (histSupplier !== 'all') {
      if (histSupplier === 'none') list = list.filter(p => !p.supplierId);
      else list = list.filter(p => p.supplierId === histSupplier);
    }
    if (histFrom) {
      const from = new Date(histFrom); from.setHours(0, 0, 0, 0);
      list = list.filter(p => new Date(p.invoiceDate) >= from);
    }
    if (histTo) {
      const to = new Date(histTo); to.setHours(23, 59, 59, 999);
      list = list.filter(p => new Date(p.invoiceDate) <= to);
    }
    list.sort((a, b) => {
      switch (histSort) {
        case 'date_asc': return +new Date(a.invoiceDate) - +new Date(b.invoiceDate);
        case 'total_desc': return b.total - a.total;
        case 'total_asc': return a.total - b.total;
        default: return +new Date(b.invoiceDate) - +new Date(a.invoiceDate);
      }
    });
    return list;
  }, [purchases, histSearch, histSupplier, histFrom, histTo, histSort]);

  const filteredHistoryTotal = filteredHistory.reduce((s, p) => s + p.total, 0);
  const hasHistFilter = !!(histSearch || histSupplier !== 'all' || histFrom || histTo);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 pb-32">
        <div className="flex items-center justify-center py-4">
          <h2 className="text-xl font-bold">{t('purchases.title')}</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-2 text-center">
              <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-base font-bold">{purchases.length}</p>
              <p className="text-[10px] text-muted-foreground">{t('suppliers.invoiceCount')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-2 text-center">
              <Receipt className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <p className="text-base font-bold text-blue-700">{totalPurchasesAmount.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{t('common.total')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-2 text-center">
              <CalendarDays className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <p className="text-base font-bold text-green-700">{monthTotal.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{t('expenses.monthExpenses')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
            <CardContent className="p-2 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-orange-600" />
              <p className="text-base font-bold text-orange-700">{todayTotal.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{t('expenses.todayExpenses')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary stats: top supplier + total debt */}
        {(topSupplier || totalSupplierDebt > 0) && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {topSupplier && (
              <Card>
                <CardContent className="p-2 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{t('common.supplier')}</p>
                    <p className="text-xs font-bold truncate">{topSupplier.name}</p>
                    <p className="text-[10px] text-muted-foreground">{topSupplier.total.toFixed(2)} TND · {topSupplier.count}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {totalSupplierDebt > 0 && (
              <Card className="border-destructive/30">
                <CardContent className="p-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-destructive shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">{t('suppliers.debtBalance')}</p>
                    <p className="text-sm font-bold text-destructive">{totalSupplierDebt.toFixed(3)} TND</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'new' | 'history')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">{t('purchases.newInvoice')}</TabsTrigger>
            <TabsTrigger value="history">{t('purchases.history')} ({purchases.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            {/* Invoice Info */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-36 text-center text-sm" dir="ltr" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('purchases.invoiceDate')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="text" value={invoiceNumber} onChange={(e) => onSetInvoiceNumber(e.target.value)} className="w-16 text-center" dir="ltr" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('purchases.invoiceNumber')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('purchases.selectSupplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('purchases.noSupplier')}</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.debtBalance > 0 ? `(${t('suppliers.debtBalance')}: ${s.debtBalance.toFixed(3)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{t('common.supplier')}</span>
                </div>

                {/* Payment mode + pay debt */}
                {selectedSupplierId && selectedSupplierId !== 'none' && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={paymentMode === 'credit' ? 'default' : 'outline'}
                        className="h-8 text-xs gap-1"
                        onClick={() => setPaymentMode('credit')}
                        type="button"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        {t('sell.credit') || 'آجل'}
                      </Button>
                      <Button
                        size="sm"
                        variant={paymentMode === 'cash' ? 'default' : 'outline'}
                        className="h-8 text-xs gap-1"
                        onClick={() => setPaymentMode('cash')}
                        type="button"
                      >
                        <BadgeDollarSign className="w-3.5 h-3.5" />
                        {t('sell.cash') || 'نقدي'}
                      </Button>
                    </div>
                    {selectedSupplier && selectedSupplier.debtBalance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1 border-destructive/40 text-destructive"
                        onClick={() => setPayDebtOpen(true)}
                        type="button"
                      >
                        {t('suppliers.debtBalance')}: {selectedSupplier.debtBalance.toFixed(3)}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search + add product */}
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowProductSearch(e.target.value.length > 0); }}
                    placeholder={t('sell.searchProduct')}
                    className="text-right pr-3"
                    onFocus={() => searchQuery.length > 0 && setShowProductSearch(true)}
                  />
                  {showProductSearch && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.slice(0, 8).map(product => (
                          <button key={product.id} onClick={() => handleSelectProduct(product)} className="w-full p-3 text-right hover:bg-muted flex justify-between items-center border-b last:border-0">
                            <span className="text-muted-foreground text-sm">{(product.cost || product.price * 0.7).toFixed(3)} TND</span>
                            <div className="text-right">
                              <span>{product.name}</span>
                              <span className="text-xs text-muted-foreground mr-2">({t('common.stock')}: {product.stock})</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-sm text-muted-foreground space-y-2">
                          <p>{t('sell.noProducts')}</p>
                          {onAddProduct && (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setShowProductSearch(false); setShowAddProduct(true); }}>
                              <PackagePlus className="w-4 h-4" /> {t('inventory.addProduct')}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {onAddProduct && (
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowAddProduct(true)} title={t('inventory.addProduct')}>
                    <PackagePlus className="w-5 h-5" />
                  </Button>
                )}
                <Button variant="outline" size="icon" className="shrink-0">
                  <Barcode className="w-5 h-5" />
                </Button>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-20">{t('common.total')}</TableHead>
                      <TableHead className="text-center w-20">{t('common.quantity')}</TableHead>
                      <TableHead className="text-center w-20">{t('common.cost')}</TableHead>
                      <TableHead className="text-right">{t('common.product')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          {t('sell.noProducts')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentItems.map((item) => (
                        <TableRow key={item.product.id}>
                          <TableCell className="text-center font-medium">{item.total.toFixed(3)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}>
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => onUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                className="w-14 text-center h-7 text-sm"
                                dir="ltr"
                                min="1"
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={item.cost} onChange={(e) => onUpdateCost(item.product.id, parseFloat(e.target.value) || 0)} className="w-16 text-center h-8 text-sm" dir="ltr" step="0.001" />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="truncate max-w-24">{item.product.name}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveItem(item.product.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {/* Filters */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={histSearch}
                    onChange={(e) => setHistSearch(e.target.value)}
                    placeholder={t('common.search') || 'بحث (رقم، مورد، منتج)'}
                    className="pr-9 text-right"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('common.from') || 'من'}</Label>
                    <Input type="date" value={histFrom} onChange={(e) => setHistFrom(e.target.value)} className="h-8 text-xs" dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">{t('common.to') || 'إلى'}</Label>
                    <Input type="date" value={histTo} onChange={(e) => setHistTo(e.target.value)} className="h-8 text-xs" dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={histSupplier} onValueChange={setHistSupplier}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('common.supplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all') || 'الكل'}</SelectItem>
                      <SelectItem value="none">{t('purchases.noSupplier')}</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={histSort} onValueChange={(v) => setHistSort(v as SortKey)}>
                    <SelectTrigger className="h-8 text-xs">
                      <ArrowUpDown className="w-3 h-3 ml-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date_desc">{t('common.date') || 'التاريخ'} ↓</SelectItem>
                      <SelectItem value="date_asc">{t('common.date') || 'التاريخ'} ↑</SelectItem>
                      <SelectItem value="total_desc">{t('common.total')} ↓</SelectItem>
                      <SelectItem value="total_asc">{t('common.total')} ↑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasHistFilter && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {filteredHistory.length} · {filteredHistoryTotal.toFixed(3)} TND
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setHistSearch(''); setHistSupplier('all'); setHistFrom(''); setHistTo(''); }}>
                      <X className="w-3 h-3" /> {t('common.clear') || 'مسح'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('purchases.noInvoices')}</div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(purchase => (
                  <Card key={purchase.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedPurchase(expandedPurchase === purchase.id ? null : purchase.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedPurchase === purchase.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span className="font-bold text-primary">{purchase.total.toFixed(3)} TND</span>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">#{purchase.invoiceNumber}</Badge>
                            <span className="text-sm font-medium">{format(new Date(purchase.invoiceDate), 'yyyy/MM/dd')}</span>
                          </div>
                          {purchase.supplierName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{purchase.supplierName}</p>
                          )}
                        </div>
                      </button>

                      {expandedPurchase === purchase.id && (
                        <div className="border-t px-3 pb-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-center text-xs">{t('common.total')}</TableHead>
                                <TableHead className="text-center text-xs">{t('common.quantity')}</TableHead>
                                <TableHead className="text-center text-xs">{t('common.cost')}</TableHead>
                                <TableHead className="text-right text-xs">{t('common.product')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {purchase.items.map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-center text-sm">{item.total.toFixed(3)}</TableCell>
                                  <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                                  <TableCell className="text-center text-sm">{item.cost.toFixed(3)}</TableCell>
                                  <TableCell className="text-right text-sm">{item.product.name}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t">
                            <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => setDeleteId(purchase.id)}>
                              <Trash2 className="w-3 h-3" /> {t('common.delete')}
                            </Button>
                            <div className="text-sm">
                              <span className="text-muted-foreground">{t('common.total')}: </span>
                              <span className="font-bold">{purchase.total.toFixed(3)} TND</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Fixed Footer */}
      {activeView === 'new' && (
        <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-3">
          <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{currentItems.length} {t('common.items')}</span>
            </div>
            <div className="bg-destructive text-destructive-foreground rounded px-4 py-2">
              <span className="font-bold">{currentTotal.toFixed(3)}</span>
            </div>
            <span className="font-medium">{t('common.total')}</span>
            <Button onClick={handleSave} disabled={currentItems.length === 0} size="sm" className="gap-1">
              <Save className="w-4 h-4" /> {t('common.save')}
            </Button>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={async () => { if (deleteId && onDeletePurchase) { await onDeletePurchase(deleteId); setDeleteId(null); } }}
        title={t('purchases.invoiceDeleted')}
        description={t('purchases.confirmDelete')}
      />

      {/* Pay supplier debt dialog */}
      {payDebtOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setPayDebtOpen(false)} />
          <div className="relative z-50 w-full max-w-sm bg-background rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{t('suppliers.debtBalance')} — {selectedSupplier.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => setPayDebtOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('suppliers.debtBalance')}: <span className="font-bold text-destructive">{selectedSupplier.debtBalance.toFixed(3)} TND</span>
            </p>
            <div className="space-y-1">
              <Label className="text-xs">{t('common.amount')}</Label>
              <Input
                type="number" step="0.001" min="0" max={selectedSupplier.debtBalance}
                value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)}
                placeholder="0.000" dir="ltr"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayDebtAmount(selectedSupplier.debtBalance.toFixed(3))}>
                {t('common.all') || 'الكل'}
              </Button>
              <Button className="flex-1" onClick={handlePayDebt}>
                <Save className="w-4 h-4 ml-1" /> {t('common.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add product dialog */}
      {onAddProduct && (
        <AddProductDialog
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          onAddProduct={onAddProduct}
        />
      )}

      {savedPurchaseData && (
        <PurchaseReceiptPrinter
          open={receiptOpen}
          onOpenChange={(open) => { setReceiptOpen(open); if (!open) setSavedPurchaseData(null); }}
          items={savedPurchaseData.items}
          total={savedPurchaseData.total}
          invoiceNumber={savedPurchaseData.invoiceNumber}
          invoiceDate={savedPurchaseData.invoiceDate}
          supplier={savedPurchaseData.supplier}
          kioskName={kioskName}
          kioskNameFr={kioskNameFr}
          storePhone={storePhone}
          storeAddress={storeAddress}
          commercialRegister={commercialRegister}
          autoExport
        />
      )}
    </div>
  );
};

export default PurchasesTab;
