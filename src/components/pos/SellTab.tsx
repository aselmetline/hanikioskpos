import { ShoppingBag, ScanLine, PauseCircle, PlayCircle, History, Trash2 } from 'lucide-react';
import { Product, CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { CartSheet } from './CartSheet';
import { LoadingState } from './LoadingState';
import { BarcodeScanner } from './BarcodeScanner';
import { OpenAmountDialog } from './OpenAmountDialog';
import { useT } from '@/contexts/LanguageContext';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PARKED_KEY = 'pos_parked_carts';
interface ParkedCart { id: string; label: number; at: number; items: CartItem[]; discount: number; }

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
  onClearCart?: () => void;
  onLoadCart?: (items: CartItem[], discount: number) => void;
  onUpdateItemDiscount?: (productId: string, discount: number) => void;
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
  onClearCart,
  onLoadCart,
  onUpdateItemDiscount,
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
  const [openPriceProduct, setOpenPriceProduct] = useState<Product | null>(null);
  const [showParked, setShowParked] = useState(false);
  const [parked, setParked] = useState<ParkedCart[]>(() => {
    try { return JSON.parse(localStorage.getItem(PARKED_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(PARKED_KEY, JSON.stringify(parked)); } catch { /* ignore */ }
  }, [parked]);

  const makeParked = (): ParkedCart => {
    const used = new Set(parked.map(p => p.label));
    let label = 1;
    while (used.has(label)) label++;
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, at: Date.now(), items: cartItems, discount: globalDiscount };
  };

  const parkCurrent = () => {
    if (cartItems.length === 0 || !onLoadCart) return;
    const p = makeParked();
    setParked(prev => [...prev, p]);
    onLoadCart([], 0);
    setIsCartOpen(false);
    toast.success(`${t('sell.cartParked')} #${p.label}`);
  };

  const resumeParked = (id: string) => {
    const target = parked.find(p => p.id === id);
    if (!target || !onLoadCart) return;
    let next = parked.filter(p => p.id !== id);
    if (cartItems.length > 0) {
      if (!window.confirm(t('sell.resumeReplaceConfirm'))) return;
      next = [...next, makeParked()];
    }
    setParked(next);
    onLoadCart(target.items, target.discount);
    setShowParked(false);
    setIsCartOpen(true);
    toast.success(`${t('sell.cartResumed')} #${target.label}`);
  };

  const lastHandledRef = useRef<{ code: string; at: number } | null>(null);

  // Open-price products ask for the amount in TND before entering the cart.
  const handleProductSelect = (product: Product) => {
    if (product.isOpenPrice) {
      setOpenPriceProduct(product);
      return;
    }
    onAddToCart(product);
  };

  const handleOpenPriceConfirm = (amount: number) => {
    if (!openPriceProduct) return;
    const existing = cartItems.find(i => i.product.id === openPriceProduct.id);
    const newAmount = (existing ? existing.product.price : 0) + amount;
    if (existing) onRemoveItem(openPriceProduct.id);
    onAddToCart({ ...openPriceProduct, price: newAmount });
    setOpenPriceProduct(null);
  };

  const handleBarcodeScan = (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;
    // Ignore duplicate deliveries of the same barcode within 3s.
    const now = Date.now();
    const last = lastHandledRef.current;
    if (last && last.code === code && now - last.at < 3000) return;
    lastHandledRef.current = { code, at: now };


    const product = allProducts.find(p => p.barcode === code);
    if (product) {
      if (product.isOpenPrice) {
        setOpenPriceProduct(product);
        return;
      }
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
                  onAdd={handleProductSelect}
                  inCart={cartItems.find(i => i.product.id === product.id)?.quantity ?? 0}
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

      {/* Floating Cart + Park controls */}
      {(itemCount > 0 || parked.length > 0) && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 z-40 animate-slide-up">
          {parked.length > 0 && (
            <button
              onClick={() => setShowParked(true)}
              className="relative bg-secondary text-secondary-foreground rounded-2xl shadow-lg px-4 py-4 flex items-center gap-2 border border-border"
              title={t('sell.parkedCarts')}
            >
              <History className="w-5 h-5" />
              <span className="absolute -top-2 -end-2 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {parked.length}
              </span>
            </button>
          )}
          {itemCount > 0 && (
            <>
              <button
                onClick={parkCurrent}
                className="bg-secondary text-secondary-foreground rounded-2xl shadow-lg px-4 py-4 flex items-center gap-2 border border-border"
                title={t('sell.parkCart')}
              >
                <PauseCircle className="w-5 h-5" />
                <span className="font-semibold text-sm hidden sm:inline">{t('sell.parkCart')}</span>
              </button>
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-primary text-primary-foreground rounded-2xl shadow-lg px-6 py-4 flex items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-bold">{itemCount} {t('common.items')}</span>
                </div>
                <div className="w-px h-6 bg-primary-foreground/30" />
                <span className="font-bold text-lg">{total.toFixed(3)} {CURRENCY}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Parked carts list */}
      <Dialog open={showParked} onOpenChange={setShowParked}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('sell.parkedCarts')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {parked.map((p) => {
              const count = p.items.reduce((s, i) => s + i.quantity, 0);
              const sum = p.items.reduce((s, i) => s + i.product.price * i.quantity - i.discount, 0) - p.discount;
              return (
                <div key={p.id} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{t('sell.cartLabel')} #{p.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {count} {t('common.items')} · {sum.toFixed(3)} {CURRENCY}
                    </p>
                  </div>
                  <button onClick={() => resumeParked(p.id)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1">
                    <PlayCircle className="w-4 h-4" />{t('sell.resume')}
                  </button>
                  <button
                    onClick={() => { if (window.confirm(t('sell.deleteParkedConfirm'))) setParked(prev => prev.filter(x => x.id !== p.id)); }}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
        onClearCart={onClearCart}
        onUpdateItemDiscount={onUpdateItemDiscount}
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

      {/* Open-price amount entry */}
      <OpenAmountDialog
        open={!!openPriceProduct}
        product={openPriceProduct}
        onOpenChange={(o) => !o && setOpenPriceProduct(null)}
        onConfirm={handleOpenPriceConfirm}
      />
    </div>
  );
}
