import { Package, Plus, Edit2, Trash2, AlertTriangle, Download, Upload } from 'lucide-react';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { LoadingState } from './LoadingState';
import { AddProductDialog } from './AddProductDialog';
import { EditProductDialog } from './EditProductDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { ExcelImportDialog } from './ExcelImportDialog';
import { exportProductsToExcel, ExcelProduct } from '@/utils/excelUtils';
import { useT } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { toast } from 'sonner';

interface InventoryTabProps {
  products: Product[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lowStockProducts: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
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
  }) => Promise<Product | void>;
  loading?: boolean;
}

export function InventoryTab({
  products,
  searchQuery,
  onSearchChange,
  lowStockProducts,
  onUpdateProduct,
  onDeleteProduct,
  onAddProduct,
  loading = false
}: InventoryTabProps) {
  const t = useT();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);

  const handleDeleteConfirm = () => {
    if (deleteProductId) {
      onDeleteProduct(deleteProductId);
      setDeleteProductId(null);
    }
  };

  const handleExport = () => {
    if (products.length === 0) {
      toast.error(t('common.noData'));
      return;
    }
    exportProductsToExcel(products);
    toast.success(t('common.success'));
  };

  const handleImport = async (importedProducts: ExcelProduct[]) => {
    let successCount = 0;
    for (const p of importedProducts) {
      try {
        await onAddProduct(p);
        successCount++;
      } catch (err) {
        console.error('Failed to import product:', p.nameAr, err);
      }
    }
    toast.success(`${successCount} ✓`);
  };


  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={`${t('common.search')}...`}
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="mx-4 mb-4 p-4 bg-warning/10 border border-warning/30 rounded-xl">
          <div className="flex items-center gap-2 text-warning font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{t('inventory.lowStock')} ({lowStockProducts.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.slice(0, 5).map(p => (
              <span key={p.id} className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full">
                {p.nameAr} ({p.stock})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Products List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {loading ? (
          <LoadingState variant="list" count={5} />
        ) : (
          <>
            {products.map((product) => {
              const isLowStock = product.stock <= product.lowStockAlert && product.lowStockAlert > 0;

              return (
                <div key={product.id} className="pos-card">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate">{product.nameAr}</h4>
                      <p className="text-xs text-muted-foreground">{product.barcode || t('common.noData')}</p>
                    </div>
                    
                    <div className="text-left">
                      <p className="font-bold text-success">{product.price.toFixed(3)} {CURRENCY}</p>
                      <p className={`text-sm ${isLowStock ? 'text-warning font-bold' : 'text-muted-foreground'}`}>
                        {product.stock} {product.unit}
                      </p>
                    </div>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditProduct(product)}
                        className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center"
                      >
                        <Edit2 className="w-4 h-4 text-secondary-foreground" />
                      </button>
                      <button
                        onClick={() => setDeleteProductId(product.id)}
                        className="w-9 h-9 bg-destructive/10 rounded-lg flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {products.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">{t('common.noData')}</p>
                <p className="text-sm">{t('inventory.addProduct')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Product Button */}
      <div className="fixed bottom-24 left-4 flex flex-col gap-2 z-40">
        <button
          onClick={handleExport}
          className="w-12 h-12 bg-secondary text-secondary-foreground rounded-xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          title={t('inventory.exportExcel')}
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowImportDialog(true)}
          className="w-12 h-12 bg-secondary text-secondary-foreground rounded-xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          title={t('inventory.importExcel')}
        >
          <Upload className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setShowAddDialog(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAddProduct={onAddProduct}
      />

      {/* Excel Import Dialog */}
      <ExcelImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />

      {/* Edit Product Dialog */}
      <EditProductDialog
        open={editProduct !== null}
        onOpenChange={(open) => !open && setEditProduct(null)}
        product={editProduct}
        onUpdateProduct={onUpdateProduct}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteProductId !== null}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
        onConfirm={handleDeleteConfirm}
        title={t('inventory.deleteProduct')}
        description={t('inventory.confirmDelete')}
      />
    </div>
  );
}
