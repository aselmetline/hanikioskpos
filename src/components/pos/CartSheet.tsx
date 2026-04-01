import { ShoppingBag, Minus, Plus, Trash2, X, CreditCard, Banknote, MessageCircle, Award } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { useState, useEffect } from 'react';
import { ReceiptPrinter } from './ReceiptPrinter';

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
  onCheckout: (paymentMethod: 'cash' | 'credit', customer?: Customer, pointsToRedeem?: number) => Promise<string | null>;
  customers: Customer[];
  kioskName?: string;
  kioskNameFr?: string;
  pointsToDiscountRate?: number;
  taxEnabled?: boolean;
  taxRate?: number;
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
  taxRate = 0.19
}: CartSheetProps) {
  const [discountInput, setDiscountInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [lastItems, setLastItems] = useState<CartItem[]>([]);
  const [lastTotals, setLastTotals] = useState({ subtotal: 0, tax: 0, total: 0, discount: 0 });
  const [lastSaleId, setLastSaleId] = useState<string | undefined>();
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
    
    // Save for receipt
    setLastItems([...items]);
    setLastTotals({ subtotal, tax, total: finalTotal, discount: globalDiscount + pointsDiscount });
    setLastPaymentMethod(method);
    
    const saleId = await onCheckout(method, customer, usePoints ? pointsToRedeem : 0);
    setLastSaleId(saleId || undefined);
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
    
    const message = `🛒 طلب جديد من كشك هاني\n\n${itemsList}\n\n💰 المجموع: ${total.toFixed(3)} ${CURRENCY}\n\n📍 العنوان: `;
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
              <span className="font-bold text-lg">السلة ({items.length})</span>
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
                  نقدي
                </button>
                <button
                  onClick={() => handleCheckout('credit')}
                  className="pos-button-outline text-sm py-2.5"
                >
                  <CreditCard className="w-4 h-4" />
                  آجل
                </button>
              </div>
              <button
                onClick={handleWhatsAppOrder}
                className="w-full pos-button bg-success text-success-foreground py-2.5 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                طلب توصيل واتساب
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="overflow-y-auto max-h-[35vh] p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>السلة فارغة</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="pos-card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{item.product.nameAr}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.product.price.toFixed(3)} × {item.quantity}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    className="pos-quantity-btn bg-muted text-foreground"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    className="pos-quantity-btn bg-primary text-primary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
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
                <option value="">زبون عابر</option>
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
                    <span className="font-bold text-amber-600">نقاط {selectedCustomer.name}</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{selectedCustomer.points} نقطة</span>
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
                  <label htmlFor="usePoints" className="text-sm">استخدام النقاط للخصم</label>
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
                      <span>{pointsToRedeem} نقطة</span>
                      <span className="text-success font-bold">خصم: {pointsDiscount.toFixed(3)} {CURRENCY}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pointsToDiscountRate} نقطة = 1 {CURRENCY}
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
                placeholder="خصم (TND)"
                className="pos-input flex-1 text-sm"
              />
              <button onClick={applyDiscount} className="pos-button-outline text-sm px-4">
                تطبيق
              </button>
            </div>

            {/* Totals */}
            <div className="px-4 py-3 bg-muted space-y-2">
              <div className="flex justify-between text-sm">
                <span>المجموع الفرعي</span>
                <span>{subtotal.toFixed(3)} {CURRENCY}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>الخصم</span>
                  <span>-{globalDiscount.toFixed(3)} {CURRENCY}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>خصم النقاط ({pointsToRedeem} نقطة)</span>
                  <span>-{pointsDiscount.toFixed(3)} {CURRENCY}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>TVA 19%</span>
                <span>{tax.toFixed(3)} {CURRENCY}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>الإجمالي</span>
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
      />
    </div>
  );
}
