import { ShoppingBag, Minus, Plus, Trash2, X, CreditCard, Banknote, MessageCircle, Award } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { useT } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { ReceiptPrinter } from './ReceiptPrinter';

interface CheckoutResult {
  saleId: string;
  invoiceNumber?: number;
  fiscalStamp?: number;
  total?: number;
  taxBreakdown?: Record<string, { base: number; tax: number }>;
}

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  globalDiscount: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSetDiscount: (discount: number) => void;
  onCheckout: (paymentMethod: 'cash' | 'credit', customer?: Customer, pointsToRedeem?: number) => Promise<CheckoutResult | null>;
  customers: Customer[];
  kioskName?: string;
  kioskNameFr?: string;
  pointsToDiscountRate?: number;
  taxEnabled?: boolean;
  taxRate?: number;
  storePhone?: string;
  storeAddress?: string;
  commercialRegister?: string;
  matriculeFiscal?: string;
  fiscalStampEnabled?: boolean;
  fiscalStampAmount?: number;
  taxBreakdown?: Record<string, { base: number; tax: number }>;
}

export function CartSheet({
  isOpen,
  onClose,
  items,
  subtotal,
  tax,
  total,
  globalDiscount,
  onUpdateQuantity,
  onRemoveItem,
  onSetDiscount,
  onCheckout,
  customers,
  kioskName,
  kioskNameFr,
  pointsToDiscountRate = 100,
  taxEnabled = true,
  taxRate = 0.19,
  storePhone,
  storeAddress,
  commercialRegister,
  matriculeFiscal,
  fiscalStampEnabled = true,
  fiscalStampAmount = 1,
  taxBreakdown,
}: CartSheetProps) {
  const t = useT();
  const [discountInput, setDiscountInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [lastItems, setLastItems] = useState<CartItem[]>([]);
  const [lastTotals, setLastTotals] = useState({ subtotal: 0, tax: 0, total: 0, discount: 0, fiscalStamp: 0 });
  const [lastSaleId, setLastSaleId] = useState<string | undefined>();
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<number | undefined>();
  const [lastBreakdown, setLastBreakdown] = useState<Record<string, { base: number; tax: number }> | undefined>();
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const maxPointsDiscount = selectedCustomer ? selectedCustomer.points / pointsToDiscountRate : 0;
  const pointsDiscount = usePoints ? Math.min(pointsToRedeem / pointsToDiscountRate, maxPointsDiscount, total) : 0;
  const finalTotal = total - pointsDiscount;

  // Reset points when customer changes
  useEffect(() => {
    setUsePoints(false);
    setPointsToRedeem(0);
  }, [selectedCustomerId]);

  if (!isOpen) return null;

  const handleCheckout = async (method: 'cash' | 'credit') => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    setLastPaymentMethod(method);

    const result = await onCheckout(method, customer, usePoints ? pointsToRedeem : 0);

    const stamp = result?.fiscalStamp ?? (fiscalStampEnabled && method === 'cash' ? fiscalStampAmount : 0);
    const serverTotal = result?.total ?? (finalTotal + stamp);

    setLastItems([...items]);
    setLastTotals({ subtotal, tax, total: serverTotal, discount: globalDiscount + pointsDiscount, fiscalStamp: stamp });
    setLastSaleId(result?.saleId || undefined);
    setLastInvoiceNumber(result?.invoiceNumber);
    setLastBreakdown(result?.taxBreakdown ?? taxBreakdown);
    setShowReceipt(true);
    setUsePoints(false);
    setPointsToRedeem(0);
  };
  
  const handleCloseReceipt = () => {
    setShowReceipt(false);
    onClose();
  };

  const handleWhatsAppOrder = () => {
    const itemsList = items.map(item =>
      `• ${item.product.nameAr} × ${item.quantity} = ${(item.product.price * item.quantity).toFixed(3)} ${CURRENCY}`
    ).join('\n');

    const message = `🛒 ${t('purchases.newInvoice')}\n\n${itemsList}\n\n💰 ${t('common.total')}: ${total.toFixed(3)} ${CURRENCY}\n\n📍 ${t('common.address')}: `;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const applyDiscount = () => {
    const discount = parseFloat(discountInput) || 0;
    onSetDiscount(discount);
    setDiscountInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card rounded-t-2xl border-b border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">{t('sell.cart')} ({items.length})</span>
            </div>
            <div className="w-10" />
          </div>
          
          {/* Payment Buttons in Header */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCheckout('cash')}
                  className="pos-button-success text-sm py-2.5"
                >
                  <Banknote className="w-4 h-4" />
                  {t('common.cash')}
                </button>
                <button
                  onClick={() => handleCheckout('credit')}
                  className="pos-button-outline text-sm py-2.5"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('common.credit')}
                </button>
              </div>
              <button
                onClick={handleWhatsAppOrder}
                className="w-full pos-button bg-success text-success-foreground py-2.5 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="overflow-y-auto max-h-[35vh] p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('sell.emptyCart')}</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="pos-card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{item.product.nameAr}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.product.isOpenPrice
                      ? `${t('sell.openPrice')} — ${item.product.price.toFixed(3)} ${CURRENCY}`
                      : `${item.product.price.toFixed(3)} × ${item.quantity}`}
                  </p>
                  {!item.product.isOpenPrice && (
                    <p className={`text-xs font-bold ${
                      item.product.stock - item.quantity <= 0 ? 'text-destructive' : 'text-muted-foreground'
                    }`}>
                      {t('sell.remaining')}: {Math.max(0, item.product.stock - item.quantity)} {item.product.unit}
                    </p>
                  )}
                </div>
                
                {!item.product.isOpenPrice && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                      className="pos-quantity-btn bg-muted text-foreground"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        if (Number.isNaN(raw)) return;
                        const qty = Math.max(1, Math.min(raw, item.product.stock || raw));
                        onUpdateQuantity(item.product.id, qty);
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={t('sell.quantity')}
                      className="w-14 h-9 text-center font-bold rounded-lg border border-border bg-background"
                    />
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="pos-quantity-btn bg-primary text-primary-foreground disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="text-left min-w-[80px]">
                  <p className="font-bold text-success">
                    {(item.product.price * item.quantity).toFixed(3)}
                  </p>
                </div>

                
                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="w-8 h-8 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <>
            {/* Customer Selection */}
            <div className="px-4 py-2 border-t border-border">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="pos-input text-sm"
              >
                <option value="">{t('sell.noCustomer')}</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>

            {/* Points Redemption - Show only if customer selected and has points */}
            {selectedCustomer && selectedCustomer.points > 0 && (
              <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-amber-600">{t('sell.points')} : {selectedCustomer.name}</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{selectedCustomer.points} {t('sell.points')}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="usePoints"
                    checked={usePoints}
                    onChange={(e) => {
                      setUsePoints(e.target.checked);
                      if (e.target.checked) {
                        setPointsToRedeem(Math.min(selectedCustomer.points, Math.floor(total * pointsToDiscountRate)));
                      }
                    }}
                    className="w-5 h-5 accent-amber-500"
                  />
                  <label htmlFor="usePoints" className="text-sm">{t('sell.redeemPoints')}</label>
                </div>
                
                {usePoints && (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={Math.min(selectedCustomer.points, Math.floor(total * pointsToDiscountRate))}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-sm">
                      <span>{pointsToRedeem} {t('sell.points')}</span>
                      <span className="text-success font-bold">{t('common.discount')}: {pointsDiscount.toFixed(3)} {CURRENCY}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pointsToDiscountRate} {t('sell.points')} = 1 {CURRENCY}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Discount */}
            <div className="px-4 py-2 flex gap-2">
              <input
                type="number"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder={`${t('common.discount')} (TND)`}
                className="pos-input flex-1 text-sm"
              />
              <button onClick={applyDiscount} className="pos-button-outline text-sm px-4">
                {t('common.confirm')}
              </button>
            </div>

            {/* Totals */}
            <div className="px-4 py-3 bg-muted space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('common.subtotal')}</span>
                <span>{subtotal.toFixed(3)} {CURRENCY}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>{t('common.discount')}</span>
                  <span>-{globalDiscount.toFixed(3)} {CURRENCY}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>{t('sell.points')} ({pointsToRedeem})</span>
                  <span>-{pointsDiscount.toFixed(3)} {CURRENCY}</span>
                </div>
              )}
              {taxEnabled && taxBreakdown && Object.keys(taxBreakdown).length > 0 ? (
                Object.entries(taxBreakdown)
                  .filter(([, v]) => v.tax > 0.0005)
                  .sort()
                  .map(([rate, v]) => (
                    <div key={rate} className="flex justify-between text-sm">
                      <span>TVA {(Number(rate) * 100).toFixed(0)}% (base {v.base.toFixed(3)})</span>
                      <span>{v.tax.toFixed(3)} {CURRENCY}</span>
                    </div>
                  ))
              ) : taxEnabled ? (
                <div className="flex justify-between text-sm">
                  <span>TVA {(taxRate * 100).toFixed(0)}%</span>
                  <span>{tax.toFixed(3)} {CURRENCY}</span>
                </div>
              ) : null}
              {fiscalStampEnabled && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>الطابع الجبائي (نقدي)</span>
                  <span>+{fiscalStampAmount.toFixed(3)} {CURRENCY}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>{t('common.total')} TTC</span>
                <span className="text-success">{finalTotal.toFixed(3)} {CURRENCY}</span>
              </div>
            </div>

          </>
        )}
      </div>

      {/* Receipt Printer Dialog */}
      <ReceiptPrinter
        open={showReceipt}
        onOpenChange={handleCloseReceipt}
        items={lastItems}
        subtotal={lastTotals.subtotal}
        tax={lastTotals.tax}
        discount={lastTotals.discount}
        total={lastTotals.total}
        paymentMethod={lastPaymentMethod}
        customer={customers.find(c => c.id === selectedCustomerId)}
        kioskName={kioskName}
        kioskNameFr={kioskNameFr}
        saleId={lastSaleId}
        taxEnabled={taxEnabled}
        taxRate={taxRate}
        storePhone={storePhone}
        storeAddress={storeAddress}
        commercialRegister={commercialRegister}
        matriculeFiscal={matriculeFiscal}
        invoiceNumber={lastInvoiceNumber}
        fiscalStamp={lastTotals.fiscalStamp}
        taxBreakdown={lastBreakdown}
      />
    </div>
  );
}
