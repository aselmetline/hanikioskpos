import { ShoppingBag, Minus, Plus, Trash2, X, CreditCard, Banknote, MessageCircle } from 'lucide-react';
import { CartItem, Customer } from '@/types/pos';
import { CURRENCY } from '@/data/sampleData';
import { useState } from 'react';

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
  onCheckout: (paymentMethod: 'cash' | 'credit', customer?: Customer) => void;
  customers: Customer[];
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
  customers
}: CartSheetProps) {
  const [discountInput, setDiscountInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  if (!isOpen) return null;

  const handleCheckout = (method: 'cash' | 'credit') => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    onCheckout(method, customer);
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
    <div className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card rounded-t-3xl border-b border-border p-4">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg">السلة ({items.length})</span>
            </div>
            <div className="w-10" />
          </div>
        </div>

        {/* Cart Items */}
        <div className="overflow-y-auto max-h-[40vh] p-4 space-y-3">
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
              <div className="flex justify-between text-sm">
                <span>TVA 19%</span>
                <span>{tax.toFixed(3)} {CURRENCY}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>الإجمالي</span>
                <span className="text-success">{total.toFixed(3)} {CURRENCY}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="p-4 space-y-3 safe-bottom">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleCheckout('cash')}
                  className="pos-button-success text-lg py-4"
                >
                  <Banknote className="w-5 h-5" />
                  نقدي
                </button>
                <button
                  onClick={() => handleCheckout('credit')}
                  className="pos-button-outline text-lg py-4"
                >
                  <CreditCard className="w-5 h-5" />
                  آجل
                </button>
              </div>
              <button
                onClick={handleWhatsAppOrder}
                className="w-full pos-button bg-[#25D366] text-white py-4 text-lg"
              >
                <MessageCircle className="w-5 h-5" />
                طلب توصيل واتساب
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
