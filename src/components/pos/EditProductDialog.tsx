import { useState, useEffect } from 'react';
import { X, Package, Barcode, DollarSign, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categories } from '@/data/sampleData';
import { Product } from '@/types/pos';
import { toast } from 'sonner';

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
}

export function EditProductDialog({ open, onOpenChange, product, onUpdateProduct }: EditProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    price: '',
    cost: '',
    category: 'daily',
    barcode: '',
    stock: '',
    unit: 'قطعة',
    lowStockAlert: '10'
  });

  // Update form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        nameAr: product.nameAr || '',
        price: product.price?.toString() || '',
        cost: product.cost?.toString() || '',
        category: product.category || 'daily',
        barcode: product.barcode || '',
        stock: product.stock?.toString() || '0',
        unit: product.unit || 'قطعة',
        lowStockAlert: product.lowStockAlert?.toString() || '10'
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    // Validation
    if (!formData.nameAr.trim()) {
      toast.error('يرجى إدخال اسم المنتج بالعربية');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('يرجى إدخال سعر صحيح');
      return;
    }

    setLoading(true);
    try {
      onUpdateProduct(product.id, {
        name: formData.name.trim() || formData.nameAr.trim(),
        nameAr: formData.nameAr.trim(),
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        category: formData.category,
        barcode: formData.barcode.trim() || undefined,
        stock: parseInt(formData.stock) || 0,
        unit: formData.unit,
        lowStockAlert: parseInt(formData.lowStockAlert) || 10
      });
      
      toast.success('تم تحديث المنتج بنجاح');
      onOpenChange(false);
    } catch (error) {
      toast.error('فشل في تحديث المنتج');
    } finally {
      setLoading(false);
    }
  };

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Dialog */}
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold">تعديل المنتج</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Arabic Name */}
          <div className="space-y-2">
            <Label htmlFor="editNameAr" className="flex items-center gap-2">
              <span>اسم المنتج بالعربية</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="editNameAr"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              placeholder="مثال: حليب طازج"
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* English Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="editName">اسم المنتج بالإنجليزية (اختياري)</Label>
            <Input
              id="editName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Example: Fresh Milk"
              dir="ltr"
            />
          </div>

          {/* Price & Cost Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="editPrice" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>سعر البيع</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editPrice"
                type="number"
                step="0.001"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.000"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCost" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>سعر الشراء</span>
              </Label>
              <Input
                id="editCost"
                type="number"
                step="0.001"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.000"
                dir="ltr"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>التصنيف</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.nameAr}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barcode */}
          <div className="space-y-2">
            <Label htmlFor="editBarcode" className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              <span>الباركود (اختياري)</span>
            </Label>
            <Input
              id="editBarcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="مثال: 6281000000001"
              dir="ltr"
            />
          </div>

          {/* Stock & Unit Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="editStock" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span>الكمية</span>
              </Label>
              <Input
                id="editStock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUnit">الوحدة</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="قطعة">قطعة</SelectItem>
                  <SelectItem value="كيلو">كيلو</SelectItem>
                  <SelectItem value="لتر">لتر</SelectItem>
                  <SelectItem value="متر">متر</SelectItem>
                  <SelectItem value="علبة">علبة</SelectItem>
                  <SelectItem value="كرتون">كرتون</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="space-y-2">
            <Label htmlFor="editLowStockAlert" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>تنبيه المخزون المنخفض</span>
            </Label>
            <Input
              id="editLowStockAlert"
              type="number"
              min="0"
              value={formData.lowStockAlert}
              onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
              placeholder="10"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              سيتم تنبيهك عندما تقل الكمية عن هذا الرقم
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 pb-safe">
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الحفظ...
                </span>
              ) : (
                'حفظ التغييرات'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
