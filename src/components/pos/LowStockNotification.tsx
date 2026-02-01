import { AlertTriangle, X, Package, Bell } from 'lucide-react';
import { Product } from '@/types/pos';
import { useState, useEffect } from 'react';

interface LowStockNotificationProps {
  products: Product[];
  onDismiss?: () => void;
}

export function LowStockNotification({ products, onDismiss }: LowStockNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (products.length > 0 && !isDismissed) {
      setIsVisible(true);
    }
  }, [products.length, isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!isVisible || products.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-warning/15 border border-warning/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-warning animate-pulse" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-warning flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                تنبيه مخزون منخفض
              </h4>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-warning/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-warning" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {products.length} منتج يحتاج إلى إعادة تموين
            </p>
            
            <div className="flex flex-wrap gap-2">
              {products.slice(0, 4).map(product => (
                <div
                  key={product.id}
                  className="flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded-lg text-xs"
                >
                  <Package className="w-3 h-3 text-warning" />
                  <span className="font-medium">{product.nameAr}</span>
                  <span className="text-destructive font-bold">({product.stock})</span>
                </div>
              ))}
              {products.length > 4 && (
                <span className="text-xs text-muted-foreground px-2 py-1">
                  +{products.length - 4} آخرين
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add animation to index.css
const animationCSS = `
@keyframes slide-down {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}
`;
