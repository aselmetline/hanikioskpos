import { Package, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { useState } from 'react';

interface InventoryTabProps {
  products: Product[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lowStockProducts: Product[];
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
}

export function InventoryTab({
  products,
  searchQuery,
  onSearchChange,
  lowStockProducts,
  onUpdateProduct,
  onDeleteProduct
}: InventoryTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState('');

  const handleSaveStock = (id: string) => {
    const stock = parseInt(editStock);
    if (!isNaN(stock) && stock >= 0) {
      onUpdateProduct(id, { stock });
    }
    setEditingId(null);
    setEditStock('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <SearchBar 
          value={searchQuery} 
          onChange={onSearchChange} 
          placeholder="بحث في المخزون..."
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="mx-4 mb-4 p-4 bg-warning/10 border border-warning/30 rounded-xl">
          <div className="flex items-center gap-2 text-warning font-bold mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>تنبيه مخزون منخفض ({lowStockProducts.length})</span>
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
        {products.map((product) => {
          const isLowStock = product.stock <= product.lowStockAlert && product.lowStockAlert > 0;
          const isEditing = editingId === product.id;

          return (
            <div key={product.id} className="pos-card">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{product.nameAr}</h4>
                  <p className="text-xs text-muted-foreground">{product.barcode || 'بدون باركود'}</p>
                </div>
                
                <div className="text-left">
                  <p className="font-bold text-success">{product.price.toFixed(3)} {CURRENCY}</p>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(e.target.value)}
                        className="w-16 px-2 py-1 text-sm border rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveStock(product.id)}
                        className="text-xs bg-success text-success-foreground px-2 py-1 rounded"
                      >
                        حفظ
                      </button>
                    </div>
                  ) : (
                    <p className={`text-sm ${isLowStock ? 'text-warning font-bold' : 'text-muted-foreground'}`}>
                      {product.stock} {product.unit}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingId(product.id);
                      setEditStock(product.stock.toString());
                    }}
                    className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center"
                  >
                    <Edit2 className="w-4 h-4 text-secondary-foreground" />
                  </button>
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="w-9 h-9 bg-destructive/10 rounded-lg flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Product Button */}
      <button className="fixed bottom-24 left-4 w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-lg flex items-center justify-center z-40">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
