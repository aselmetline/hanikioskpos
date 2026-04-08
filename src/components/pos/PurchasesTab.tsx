import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Barcode, Save, Trash2, Plus, Minus, ShoppingBag, Receipt, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Product, PurchaseItem, Purchase } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { PurchaseReceiptPrinter } from './PurchaseReceiptPrinter';

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'new' | 'history'>('new');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  );

  const handleSelectProduct = (product: Product) => {
    onAddItem(product, product.cost || product.price * 0.7, 1);
    setSearchQuery('');
    setShowProductSearch(false);
  };

  const handleSave = async () => {
    if (currentItems.length === 0) {
      toast.error('أضف منتجات للفاتورة أولاً');
      return;
    }

    currentItems.forEach(item => {
      onUpdateStock(item.product.id, item.quantity, true);
    });

    if (selectedSupplierId && selectedSupplierId !== 'none' && onUpdateSupplierDebt) {
      await onUpdateSupplierDebt(selectedSupplierId, currentTotal);
    }

    onSavePurchase(new Date(invoiceDate), selectedSupplierId && selectedSupplierId !== 'none' ? selectedSupplierId : undefined);
    setSelectedSupplierId('');
  };

  // Stats
  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalItems = purchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 pb-32">
        <div className="flex items-center justify-center py-4">
          <h2 className="text-xl font-bold">المشتريات</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Card>
            <CardContent className="p-2 text-center">
              <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{purchases.length}</p>
              <p className="text-[10px] text-muted-foreground">الفواتير</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <Receipt className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <p className="text-lg font-bold">{totalPurchasesAmount.toFixed(3)}</p>
              <p className="text-[10px] text-muted-foreground">الإجمالي</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2 text-center">
              <Eye className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <p className="text-lg font-bold">{totalItems}</p>
              <p className="text-[10px] text-muted-foreground">الأصناف</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'new' | 'history')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">فاتورة جديدة</TabsTrigger>
            <TabsTrigger value="history">سجل المشتريات ({purchases.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            {/* Invoice Info */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-36 text-center text-sm" dir="ltr" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">تاريخ الفاتورة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="text" value={invoiceNumber} onChange={(e) => onSetInvoiceNumber(e.target.value)} className="w-16 text-center" dir="ltr" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">رقم الفاتورة</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر المورد (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون مورد</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} {s.debtBalance > 0 ? `(دين: ${s.debtBalance.toFixed(3)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">المورد</span>
                </div>
              </CardContent>
            </Card>

            {/* Search */}
            <Card>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowProductSearch(e.target.value.length > 0); }}
                    placeholder="ابحث عن منتج بالاسم أو الباركود"
                    className="text-right pr-3"
                    onFocus={() => searchQuery.length > 0 && setShowProductSearch(true)}
                  />
                  {showProductSearch && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredProducts.slice(0, 8).map(product => (
                        <button key={product.id} onClick={() => handleSelectProduct(product)} className="w-full p-3 text-right hover:bg-muted flex justify-between items-center border-b last:border-0">
                          <span className="text-muted-foreground text-sm">{(product.cost || product.price * 0.7).toFixed(3)} د.ت</span>
                          <div className="text-right">
                            <span>{product.name}</span>
                            <span className="text-xs text-muted-foreground mr-2">(مخزون: {product.stock})</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
                      <TableHead className="text-center w-20">الإجمالي</TableHead>
                      <TableHead className="text-center w-20">الكمية</TableHead>
                      <TableHead className="text-center w-20">التكلفه</TableHead>
                      <TableHead className="text-right">المنتج</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          لا توجد منتجات - ابحث وأضف منتجات
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
                              <span className="w-8 text-center">{item.quantity}</span>
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

          <TabsContent value="history" className="mt-4">
            {purchases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد فواتير مشتريات بعد</div>
            ) : (
              <div className="space-y-3">
                {purchases.map(purchase => (
                  <Card key={purchase.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedPurchase(expandedPurchase === purchase.id ? null : purchase.id)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedPurchase === purchase.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span className="font-bold text-primary">{purchase.total.toFixed(3)} د.ت</span>
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
                                <TableHead className="text-center text-xs">الإجمالي</TableHead>
                                <TableHead className="text-center text-xs">الكمية</TableHead>
                                <TableHead className="text-center text-xs">التكلفة</TableHead>
                                <TableHead className="text-right text-xs">المنتج</TableHead>
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
                              <Trash2 className="w-3 h-3" /> حذف الفاتورة
                            </Button>
                            <div className="text-sm">
                              <span className="text-muted-foreground">الإجمالي: </span>
                              <span className="font-bold">{purchase.total.toFixed(3)} د.ت</span>
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
              <span className="text-xs text-muted-foreground">{currentItems.length} صنف</span>
            </div>
            <div className="bg-destructive text-destructive-foreground rounded px-4 py-2">
              <span className="font-bold">{currentTotal.toFixed(3)}</span>
            </div>
            <span className="font-medium">الإجمالي</span>
            <Button onClick={handleSave} disabled={currentItems.length === 0} size="sm" className="gap-1">
              <Save className="w-4 h-4" /> حفظ
            </Button>
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={async () => { if (deleteId && onDeletePurchase) { await onDeletePurchase(deleteId); setDeleteId(null); } }}
        title="حذف فاتورة المشتريات"
        description="هل أنت متأكد من حذف هذه الفاتورة؟ سيتم حذف جميع بنودها."
      />
    </div>
  );
};

export default PurchasesTab;
