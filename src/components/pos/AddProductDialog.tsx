import { useState } from 'react';
import { X, Package, Barcode, DollarSign, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categories } from '@/data/sampleData';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: {
    name: string;
    nameAr: string;
    price: number;
    cost?: number;
    category: string;
    barcode?: string;
    stock: number;
    unit: string;
    lowStockAlert: number;
    taxRate?: number;
    isOpenPrice?: boolean;
  }) => Promise<unknown>;
}

export function AddProductDialog({ open, onOpenChange, onAddProduct }: AddProductDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isOpenPrice, setIsOpenPrice] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    price: '',
    cost: '',
    category: 'daily',
    barcode: '',
    stock: '',
    unit: 'قطعة',
    lowStockAlert: '10',
    taxRate: '0.19',
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.nameAr.trim()) {
      toast.error(t('inventory.productName'));
      return;
    }
    if (!isOpenPrice && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error(t('inventory.sellPrice'));
      return;
    }

    setLoading(true);
    try {
      await onAddProduct({
        name: formData.name.trim() || formData.nameAr.trim(),
        nameAr: formData.nameAr.trim(),
        price: isOpenPrice ? 0 : parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        category: formData.category,
        barcode: formData.barcode.trim() || undefined,
        stock: isOpenPrice ? 999999 : (parseInt(formData.stock) || 0),
        unit: isOpenPrice ? 'دينار' : formData.unit,
        lowStockAlert: isOpenPrice ? 0 : (parseInt(formData.lowStockAlert) || 10),
        taxRate: parseFloat(formData.taxRate),
        isOpenPrice,
      });

      toast.success('تم إضافة المنتج بنجاح');

      // Reset form
      setIsOpenPrice(false);
      setFormData({
        name: '',
        nameAr: '',
        price: '',
        cost: '',
        category: 'daily',
        barcode: '',
        stock: '',
        unit: 'قطعة',
        lowStockAlert: '10',
        taxRate: '0.19',
      });

      
      onOpenChange(false);
    } catch (error) {
      toast.error('فشل في إضافة المنتج');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

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
            <h2 className="text-lg font-bold">{t('inventory.addProduct')}</h2>
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
            <Label htmlFor="nameAr" className="flex items-center gap-2">
              <span>{t('inventory.productName')}</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nameAr"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              placeholder={t('inventory.productName')}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* English Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('inventory.productNameFr')} ({t('common.optional')})</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Example: Fresh Milk"
              dir="ltr"
            />
          </div>

          {/* Price & Cost Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>{t('inventory.sellPrice')}</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="price"
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
              <Label htmlFor="cost" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>{t('inventory.costPrice')}</span>
              </Label>
              <Input
                id="cost"
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
            <Label>{t('common.category')}</Label>
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
            <Label htmlFor="barcode" className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              <span>{t('common.barcode')} ({t('common.optional')})</span>
            </Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="6281000000001"
              dir="ltr"
            />
          </div>

          {/* Stock & Unit Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stock" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span>{t('common.quantity')}</span>
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">{t('common.type')}</Label>
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

          {/* VAT rate (Tunisia) */}
          <div className="space-y-2">
            <Label>معدل TVA / Taux TVA</Label>
            <Select
              value={formData.taxRate}
              onValueChange={(value) => setFormData({ ...formData, taxRate: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0% (معفى / Exonéré)</SelectItem>
                <SelectItem value="0.07">7%</SelectItem>
                <SelectItem value="0.13">13%</SelectItem>
                <SelectItem value="0.19">19% (المعدل العام)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Low Stock Alert */}
          <div className="space-y-2">
            <Label htmlFor="lowStockAlert" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>{t('inventory.lowStock')}</span>
            </Label>
            <Input
              id="lowStockAlert"
              type="number"
              min="0"
              value={formData.lowStockAlert}
              onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
              placeholder="10"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              {t('settings.lowStockThreshold')}
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
                  {t('common.loading')}
                </span>
              ) : (
                t('inventory.addProduct')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
