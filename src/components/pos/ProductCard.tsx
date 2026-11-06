import { Plus } from 'lucide-react';
import { Product } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { useT } from '@/contexts/LanguageContext';
import { formatQuantity } from '@/lib/quantity';
import { hasSubUnits, totalPieces } from '@/lib/subUnits';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
  /** Quantity of this product already in the cart */
  inCart?: number;
  /** Pieces (sub-units) of this product already in the cart */
  inCartPieces?: number;
  onAddPiece?: (product: Product) => void;
}

export function ProductCard({ product, onAdd, inCart = 0, inCartPieces = 0, onAddPiece }: ProductCardProps) {
  const t = useT();
  const isOpenPrice = !!product.isOpenPrice;
  const split = !isOpenPrice && hasSubUnits(product) && !!onAddPiece;
  const count = product.subUnitsCount ?? 0;

  // Pieces left after what is in the cart (packs consume `count` pieces each)
  const piecesLeft = split ? Math.max(0, totalPieces(product) - inCart * count - inCartPieces) : 0;
  const remaining = split
    ? Math.floor(Math.max(0, product.stock - inCart - Math.ceil(Math.max(0, inCartPieces - (product.looseStock ?? 0)) / count)))
    : Math.max(0, product.stock - inCart);
  const isLowStock = !isOpenPrice && product.stock <= product.lowStockAlert && product.lowStockAlert > 0;
  const packOut = !isOpenPrice && remaining <= 0;
  const isOutOfStock = split ? piecesLeft <= 0 : packOut;
  const loose = split ? piecesLeft - remaining * count : 0;

  const stockLabel = split
    ? `${remaining} ${product.unit}${loose > 0 ? ` + ${loose} ${product.subUnitName}` : ''}`
    : `${formatQuantity(remaining)} ${product.unit}`;

  return (
    <div className={`pos-card text-right w-full transition-all duration-200 ${isOutOfStock ? 'opacity-50' : ''}`}>
      <button
        type="button"
        onClick={() => !packOut && onAdd(product)}
        disabled={packOut}
        className={`w-full text-right ${packOut ? 'cursor-not-allowed' : 'active:scale-[0.98]'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{product.nameAr}</h3>
            <p className="text-xs text-muted-foreground truncate">{product.name}</p>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="pos-price text-lg">
                {isOpenPrice ? `— ${CURRENCY}` : `${product.price.toFixed(3)} ${CURRENCY}`}
              </span>

              <div className={`pos-badge ${
                isOpenPrice
                  ? 'bg-primary/10 text-primary'
                  : isOutOfStock
                    ? 'bg-destructive/10 text-destructive'
                    : isLowStock
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
              }`}>
                {isOpenPrice
                  ? t('sell.openPrice')
                  : isOutOfStock ? t('sell.outOfStock') : `${t('sell.remaining')}: ${stockLabel}`}
              </div>
            </div>

            {(inCart > 0 || inCartPieces > 0) && (
              <div className="mt-2 text-xs font-bold text-primary">
                {t('sell.inCart')}: {formatQuantity(inCart)}{inCartPieces > 0 ? ` + ${inCartPieces} ${product.subUnitName}` : ''}
              </div>
            )}
          </div>

          {!packOut && !split && (
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shrink-0">
              <Plus className="w-5 h-5" />
            </div>
          )}
        </div>
      </button>

      {split && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={packOut}
            onClick={() => onAdd(product)}
            className="h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40"
          >
            + {product.unit} · {product.price.toFixed(3)}
          </button>
          <button
            type="button"
            disabled={piecesLeft <= 0}
            onClick={() => onAddPiece!(product)}
            className="h-10 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold disabled:opacity-40"
          >
            + {product.subUnitName} · {(product.subUnitPrice ?? 0).toFixed(3)}
          </button>
        </div>
      )}
    </div>
  );
}
