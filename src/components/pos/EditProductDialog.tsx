import { useState, useEffect } from 'react';
import { X, Package, Barcode, DollarSign, Hash, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categories } from '@/data/sampleData';
import { Product } from '@/types/pos';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
}

export function EditProductDialog({ open, onOpenChange, product, onUpdateProduct }: EditProductDialogProps) {
  const { t, dir, language } = useLanguage();
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

  useEffect(() => {
    if (product) {
      setIsOpenPrice(!!product.isOpenPrice);
      setFormData({
        name: product.name || '',
        nameAr: product.nameAr || '',
        price: product.price?.toString() || '',
        cost: product.cost?.toString() || '',
        category: product.category || 'daily',
        barcode: product.barcode || '',
        stock: product.stock?.toString() || '0',
        unit: product.unit || 'قطعة',
        lowStockAlert: product.lowStockAlert?.toString() || '10',
        taxRate: (product.taxRate ?? 0.19).toString(),
      });
    }
  }, [product]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!formData.nameAr.trim()) {
      toast.error(t('editProduct.nameRequired'));
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error(t('editProduct.invalidPrice'));
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
        lowStockAlert: parseInt(formData.lowStockAlert) || 10,
        taxRate: parseFloat(formData.taxRate),
      });
      
      toast.success(t('editProduct.updated'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('editProduct.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open || !product) return null;

  const units = [
    { value: 'قطعة', label: t('editProduct.units.piece') },
    { value: 'كيلو', label: t('editProduct.units.kg') },
    { value: 'لتر', label: t('editProduct.units.liter') },
    { value: 'متر', label: t('editProduct.units.meter') },
    { value: 'علبة', label: t('editProduct.units.box') },
    { value: 'كرتون', label: t('editProduct.units.carton') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" dir={dir}>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up">
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold">{t('editProduct.title')}</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editNameAr" className="flex items-center gap-2">
              <span>{t('editProduct.nameAr')}</span>
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="editNameAr"
              value={formData.nameAr}
              onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              dir={dir}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editName">{t('editProduct.nameEn')}</Label>
            <Input
              id="editName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="editPrice" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>{t('editProduct.sellPrice')}</span>
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
                <span>{t('editProduct.buyPrice')}</span>
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

          <div className="space-y-2">
            <Label>{t('editProduct.category')}</Label>
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
                      <span>{language === 'fr' && (cat as any).nameFr ? (cat as any).nameFr : cat.nameAr}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="editBarcode" className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              <span>{t('editProduct.barcode')}</span>
            </Label>
            <Input
              id="editBarcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="editStock" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span>{t('editProduct.quantity')}</span>
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
              <Label htmlFor="editUnit">{t('editProduct.unit')}</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="editLowStockAlert" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span>{t('editProduct.lowStockAlert')}</span>
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
              {t('editProduct.lowStockHelp')}
            </p>
          </div>

          <div className="pt-4 pb-safe">
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('editProduct.saving')}
                </span>
              ) : (
                t('editProduct.saveChanges')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
