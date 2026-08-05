import { ShoppingBag, ScanLine } from 'lucide-react';
import { Product, CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { CartSheet } from './CartSheet';
import { LoadingState } from './LoadingState';
import { BarcodeScanner } from './BarcodeScanner';
import { useT } from '@/contexts/LanguageContext';
import { useState } from 'react';

interface SellTabProps {
  products: Product[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  globalDiscount: number;
  taxBreakdown?: Record<string, { base: number; tax: number }>;
  onSetDiscount: (discount: number) => void;
  onCheckout: (paymentMethod: 'cash' | 'credit', customer?: Customer, pointsToRedeem?: number) => Promise<{ saleId: string; invoiceNumber?: number; fiscalStamp?: number; total?: number; taxBreakdown?: Record<string, { base: number; tax: number }> } | null>;
  customers: Customer[];
  loading?: boolean;
  kioskName?: string;
  kioskNameFr?: string;
  allProducts?: Product[];
  pointsToDiscountRate?: number;
  taxEnabled?: boolean;
  taxRate?: number;
  storePhone?: string;
  storeAddress?: string;
  commercialRegister?: string;
  matriculeFiscal?: string;
  fiscalStampEnabled?: boolean;
  fiscalStampAmount?: number;
}

export function SellTab({
  products,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  tax,
  total,
  itemCount,
  globalDiscount,
  taxBreakdown,
  onSetDiscount,
  onCheckout,
  customers,
  loading = false,
  kioskName,
  kioskNameFr,
  allProducts = [],
  pointsToDiscountRate = 100,
  taxEnabled = true,
  taxRate = 0.19,
  storePhone,
  storeAddress,
  commercialRegister,
  matriculeFiscal,
  fiscalStampEnabled = true,
  fiscalStampAmount = 1,
}: SellTabProps) {
  const t = useT();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const lastHandledRef = useRef<{ code: string; at: number } | null>(null);

  const handleBarcodeScan = (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    // Ignore duplicate deliveries of the same barcode within 1.5s.
    const now = Date.now();
    const last = lastHandledRef.current;
    if (last && last.code === code && now - last.at < 1500) return;
    lastHandledRef.current = { code, at: now };

    const product = allProducts.find(p => p.barcode === code);
    if (product) {
      onAddToCart(product);
      toast.success(`${t('sell.productAddedToCart')}: ${product.nameAr || product.name}`);
    } else {
      toast.error(t('sell.productNotFound'));
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={onSearchChange} />
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center"
          >
            <ScanLine className="w-5 h-5" />
          </button>
        </div>
        <CategoryFilter 
          selectedCategory={selectedCategory} 
          onSelectCategory={onCategoryChange} 
        />
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {loading ? (
          <LoadingState variant="products" count={6} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={onAddToCart}
                />
              ))}
            </div>
            
            {products.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">{t('sell.noProducts')}</p>
                <p className="text-sm">{t('sell.searchProduct')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground rounded-2xl shadow-lg px-6 py-4 flex items-center gap-4 animate-slide-up z-40"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-bold">{itemCount} {t('common.items')}</span>
          </div>
          <div className="w-px h-6 bg-primary-foreground/30" />
          <span className="font-bold text-lg">{total.toFixed(3)} {CURRENCY}</span>
        </button>
      )}

      {/* Cart Sheet */}
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        subtotal={subtotal}
        tax={tax}
        total={total}
        globalDiscount={globalDiscount}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onSetDiscount={onSetDiscount}
        taxBreakdown={taxBreakdown}
        onCheckout={onCheckout}
        customers={customers}
        kioskName={kioskName}
        kioskNameFr={kioskNameFr}
        pointsToDiscountRate={pointsToDiscountRate}
        taxEnabled={taxEnabled}
        taxRate={taxRate}
        storePhone={storePhone}
        storeAddress={storeAddress}
        commercialRegister={commercialRegister}
        matriculeFiscal={matriculeFiscal}
        fiscalStampEnabled={fiscalStampEnabled}
        fiscalStampAmount={fiscalStampAmount}
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleBarcodeScan}
      />
    </div>
  );
}
