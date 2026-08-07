import { Plus } from 'lucide-react';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { useT } from '@/contexts/LanguageContext';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  /** Quantity of this product already in the cart */
  inCart?: number;
}

export function ProductCard({ product, onAdd, inCart = 0 }: ProductCardProps) {
  const t = useT();
  const remaining = Math.max(0, product.stock - inCart);
  const isLowStock = product.stock <= product.lowStockAlert && product.lowStockAlert > 0;
  const isOutOfStock = remaining === 0;

  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`pos-card text-right w-full transition-all duration-200 ${
        isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:scale-[0.98]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{product.nameAr}</h3>
          <p className="text-xs text-muted-foreground truncate">{product.name}</p>
          
          <div className="mt-2 flex items-center justify-between">
            <span className="pos-price text-lg">
              {product.price.toFixed(3)} {CURRENCY}
            </span>
            
            <div className={`pos-badge ${
              isOutOfStock 
                ? 'bg-destructive/10 text-destructive' 
                : isLowStock 
                  ? 'bg-warning/10 text-warning' 
                  : 'bg-success/10 text-success'
            }`}>
              {isOutOfStock ? t('sell.outOfStock') : `${t('sell.remaining')}: ${remaining} ${product.unit}`}
            </div>
          </div>

          {inCart > 0 && (
            <div className="mt-2 text-xs font-bold text-primary">
              {t('sell.inCart')}: {inCart}
            </div>
          )}
        </div>
        
        {!isOutOfStock && (
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shrink-0">
            <Plus className="w-5 h-5" />
          </div>
        )}
      </div>
    </button>
  );
}
