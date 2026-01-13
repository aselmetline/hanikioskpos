import { useState } from 'react';
import { Header } from '@/components/pos/Header';
import { BottomNav, TabType } from '@/components/pos/BottomNav';
import { SellTab } from '@/components/pos/SellTab';
import { InventoryTab } from '@/components/pos/InventoryTab';
import { CustomersTab } from '@/components/pos/CustomersTab';
import { ReportsTab } from '@/components/pos/ReportsTab';
import { SettingsTab } from '@/components/pos/SettingsTab';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useSettings } from '@/hooks/useSettings';
import { Sale, Customer } from '@/types/pos';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sell');
  const [sales, setSales] = useState<Sale[]>([]);

  const cart = useCart();
  const products = useProducts();
  const customers = useCustomers();
  const { settings, updateSettings, resetSettings } = useSettings();

  const handleCheckout = (paymentMethod: 'cash' | 'credit', customer?: Customer) => {
    if (cart.items.length === 0) return;

    const newSale: Sale = {
      id: Date.now().toString(),
      items: [...cart.items],
      subtotal: cart.subtotal,
      tax: cart.tax,
      discount: cart.globalDiscount + cart.itemsDiscount,
      total: cart.total,
      paymentMethod,
      customerId: customer?.id,
      createdAt: new Date()
    };

    setSales(prev => [newSale, ...prev]);

    // Update stock
    cart.items.forEach(item => {
      products.updateStock(item.product.id, item.quantity);
    });

    // Add points to customer
    if (customer) {
      const pointsAdded = customers.addPoints(customer.id, cart.total);
      if (paymentMethod === 'credit') {
        customers.updateCreditBalance(customer.id, cart.total);
      }
      toast.success(`تم إضافة ${pointsAdded} نقطة لـ ${customer.name}`);
    }

    cart.clearCart();
    
    toast.success(
      paymentMethod === 'cash' 
        ? `تم البيع بنجاح - ${cart.total.toFixed(3)} TND` 
        : `تم تسجيل البيع الآجل - ${cart.total.toFixed(3)} TND`
    );
  };

  const handleAddCustomer = (customerData: { name: string; phone: string }) => {
    customers.addCustomer(customerData);
    toast.success(`تم إضافة العميل ${customerData.name}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        lowStockCount={products.lowStockProducts.length}
        kioskName={settings.kioskName}
        kioskNameFr={settings.kioskNameFr}
        logo={settings.logo}
      />
      
      <main className="flex-1 overflow-hidden">
        {activeTab === 'sell' && (
          <SellTab
            products={products.filteredProducts}
            searchQuery={products.searchQuery}
            onSearchChange={products.setSearchQuery}
            selectedCategory={products.selectedCategory}
            onCategoryChange={products.setSelectedCategory}
            cartItems={cart.items}
            onAddToCart={cart.addItem}
            onUpdateQuantity={cart.updateQuantity}
            onRemoveItem={cart.removeItem}
            subtotal={cart.subtotal}
            tax={cart.tax}
            total={cart.total}
            itemCount={cart.itemCount}
            globalDiscount={cart.globalDiscount}
            onSetDiscount={cart.setGlobalDiscount}
            onCheckout={handleCheckout}
            customers={customers.customers}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            products={products.filteredProducts}
            searchQuery={products.searchQuery}
            onSearchChange={products.setSearchQuery}
            lowStockProducts={products.lowStockProducts}
            onUpdateProduct={products.updateProduct}
            onDeleteProduct={products.deleteProduct}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers.filteredCustomers}
            searchQuery={customers.searchQuery}
            onSearchChange={customers.setSearchQuery}
            onAddCustomer={handleAddCustomer}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab sales={sales} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={updateSettings}
            onResetSettings={resetSettings}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartItemCount={cart.itemCount}
      />
    </div>
  );
};

export default Index;
