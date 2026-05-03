import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseExcelProducts, downloadSampleTemplate, ExcelProduct } from '@/utils/excelUtils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (products: ExcelProduct[]) => Promise<void>;
}

export function ExcelImportDialog({ open, onOpenChange, onImport }: ExcelImportDialogProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<ExcelProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const parsed = await parseExcelProducts(file);
      setProducts(parsed);
    } catch (err: any) {
      setError(err.message || 'فشل في قراءة الملف');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (products.length === 0) return;

    setImporting(true);
    try {
      await onImport(products);
      setProducts([]);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'فشل في استيراد المنتجات');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setProducts([]);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            استيراد المنتجات من Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {products.length === 0 && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {loading ? (
                  <div className="animate-pulse">
                    <FileSpreadsheet className="w-12 h-12 mx-auto text-primary mb-3" />
                    <p>جاري قراءة الملف...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium mb-1">اضغط لاختيار ملف Excel</p>
                    <p className="text-sm text-muted-foreground">أو اسحب الملف هنا</p>
                  </>
                )}
              </div>

              {/* Download Template */}
              <button
                onClick={downloadSampleTemplate}
                className="w-full flex items-center justify-center gap-2 p-3 border rounded-xl hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                تحميل قالب Excel
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Preview */}
          {products.length > 0 && (
            <>
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <span className="text-success font-medium">
                  تم قراءة {products.length} منتج
                </span>
                <Check className="w-5 h-5 text-success" />
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-right">الاسم</th>
                      <th className="p-2 text-right">السعر</th>
                      <th className="p-2 text-right">الكمية</th>
                      <th className="p-2 text-right">التصنيف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{p.nameAr || p.name}</td>
                        <td className="p-2">{p.price.toFixed(3)}</td>
                        <td className="p-2">{p.stock}</td>
                        <td className="p-2">{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              <div className="flex gap-2">
                <button
                  onClick={() => setProducts([])}
                  className="flex-1 pos-button-outline"
                  disabled={importing}
                >
                  <X className="w-4 h-4" />
                  إلغاء
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 pos-button-success"
                  disabled={importing}
                >
                  {importing ? (
                    'جاري الاستيراد...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      استيراد الكل
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
