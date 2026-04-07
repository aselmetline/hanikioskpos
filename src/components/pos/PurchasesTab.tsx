import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Barcode, Save, Trash2, Plus, Minus } from 'lucide-react';
import { Product, PurchaseItem } from '@/types/pos';
import { Supplier } from '@/hooks/useSuppliers';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.includes(searchQuery)
  );

  const handleSelectProduct = (product: Product) => {
    onAddItem(product, product.cost || product.price * 0.7, 1);
    setSearchQuery('');
    setShowProductSearch(false);
  };

  const handleSave = () => {
    if (currentItems.length === 0) {
      toast.error('أضف منتجات للفاتورة أولاً');
      return;
    }

    // Update stock for each item (add to stock)
    currentItems.forEach(item => {
      onUpdateStock(item.product.id, item.quantity, true);
    });

    onSavePurchase(new Date(invoiceDate));
    toast.success(`تم حفظ فاتورة المشتريات رقم ${invoiceNumber}`);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-center py-4">
          <h2 className="text-xl font-bold">المشتريات</h2>
        </div>

        {/* Invoice Info */}
        <Card className="mb-4">
          <CardContent className="p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-36 text-center text-sm"
                dir="ltr"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">تاريخ الفاتورة</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={invoiceNumber}
                onChange={(e) => onSetInvoiceNumber(e.target.value)}
                className="w-16 text-center"
                dir="ltr"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">رقم الفاتورة</span>
            </div>
          </CardContent>
        </Card>

        {/* Search & Barcode */}
        <Card className="mb-4">
          <CardContent className="p-3 flex items-center gap-2">
            <Button variant="outline" size="icon" className="shrink-0">
              <Save className="w-5 h-5" />
            </Button>
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowProductSearch(e.target.value.length > 0);
                }}
                placeholder="ابحث عن منتج أو استخدم الكاميرا"
                className="text-right pr-3"
                onFocus={() => searchQuery.length > 0 && setShowProductSearch(true)}
              />
              {/* Product search dropdown */}
              {showProductSearch && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 5).map(product => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full p-3 text-right hover:bg-muted flex justify-between items-center border-b last:border-0"
                    >
                      <span className="text-muted-foreground text-sm">{(product.cost || product.price * 0.7).toFixed(3)} د.ت</span>
                      <span>{product.name}</span>
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
                      <TableCell className="text-center font-medium">
                        {item.total.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.cost}
                          onChange={(e) => onUpdateCost(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-16 text-center h-8 text-sm"
                          dir="ltr"
                          step="0.001"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="truncate max-w-24">{item.product.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => onRemoveItem(item.product.id)}
                          >
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
      </ScrollArea>

      {/* Fixed Footer with Total */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-3">
        <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-muted rounded px-3 py-2">
              <span className="text-sm text-muted-foreground">0.0</span>
            </div>
            <span className="text-sm">دينار ع.ق</span>
          </div>
          
          <div className="bg-destructive text-destructive-foreground rounded px-4 py-2">
            <span className="font-bold">{currentTotal.toFixed(3)}</span>
          </div>
          
          <span className="font-medium">الإجمالي</span>
          
          <Button
            onClick={handleSave}
            disabled={currentItems.length === 0}
            size="sm"
            className="gap-1"
          >
            <Save className="w-4 h-4" />
            حفظ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PurchasesTab;
