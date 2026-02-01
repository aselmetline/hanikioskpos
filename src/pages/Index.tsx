import { useState, useEffect } from 'react';
import { Header } from '@/components/pos/Header';
import { BottomNav, TabType } from '@/components/pos/BottomNav';
import { SellTab } from '@/components/pos/SellTab';
import { InventoryTab } from '@/components/pos/InventoryTab';
import { CustomersTab } from '@/components/pos/CustomersTab';
import { ReportsTab } from '@/components/pos/ReportsTab';
import { SettingsTab } from '@/components/pos/SettingsTab';
import CashBoxTab from '@/components/pos/CashBoxTab';
import PurchasesTab from '@/components/pos/PurchasesTab';
import ExpensesTab from '@/components/pos/ExpensesTab';
import { LowStockNotification } from '@/components/pos/LowStockNotification';
import { useCart } from '@/hooks/useCart';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useSettings } from '@/hooks/useSettings';
import { useCashBox } from '@/hooks/useCashBox';
import { usePurchases } from '@/hooks/usePurchases';
import { useExpenses } from '@/hooks/useExpenses';
import { useSales } from '@/hooks/useSales';
import { Customer, ExpenseCategory, EXPENSE_CATEGORIES } from '@/types/pos';
import { toast } from 'sonner';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sell');

  const cart = useCart();
  const products = useProducts();
  const customers = useCustomers();
  const { settings, updateSettings, resetSettings } = useSettings();
  const cashBox = useCashBox();
  const purchases = usePurchases();
  const expensesHook = useExpenses();
  const salesHook = useSales();

  const handleCheckout = async (paymentMethod: 'cash' | 'credit', customer?: Customer) => {
    if (cart.items.length === 0) return;

    const saleTotal = cart.total;

    // Create sale in database
    const sale = await salesHook.createSale(
      cart.items,
      cart.subtotal,
      cart.tax,
      cart.globalDiscount + cart.itemsDiscount,
      saleTotal,
      paymentMethod,
      customer
    );

    if (!sale) return;

    // Update stock
    for (const item of cart.items) {
      await products.updateStock(item.product.id, item.quantity);
    }

    // Auto-add to cash box if enabled and payment is cash
    if (paymentMethod === 'cash' && cashBox.settings.autoAddSales) {
      await cashBox.addTransaction('add', saleTotal, `مبيعات - ${cart.itemCount} منتج`, 'sales');
    }

    // Add points to customer
    if (customer) {
      const pointsAdded = await customers.addPoints(customer.id, saleTotal);
      if (paymentMethod === 'credit') {
        await customers.updateCreditBalance(customer.id, saleTotal);
      }
      toast.success(`تم إضافة ${pointsAdded} نقطة لـ ${customer.name}`);
    }

    cart.clearCart();
    
    toast.success(
      paymentMethod === 'cash' 
        ? `تم البيع بنجاح - ${saleTotal.toFixed(3)} TND` 
        : `تم تسجيل البيع الآجل - ${saleTotal.toFixed(3)} TND`
    );
  };

  // Handle saving purchase and auto-deduct from cash box
  const handleSavePurchase = async (invoiceDate: Date) => {
    const purchaseTotal = purchases.currentTotal;
    const purchase = await purchases.savePurchase(invoiceDate);
    
    if (purchase && cashBox.settings.autoDeductPurchases) {
      await cashBox.addTransaction('deduct', purchaseTotal, `فاتورة مشتريات رقم ${purchase.invoiceNumber}`, 'purchases');
    }
  };

  // Handle adding expense with auto-deduct from cash box
  const handleAddExpense = async (amount: number, category: ExpenseCategory, description: string, date?: Date) => {
    const expense = await expensesHook.addExpense(amount, category, description, date);
    if (!expense) return;

    const catInfo = EXPENSE_CATEGORIES.find(c => c.id === category);
    
    if (cashBox.settings.autoDeductExpenses) {
      await cashBox.addTransaction('deduct', amount, `${catInfo?.label || 'مصروفات'}: ${description || '-'}`, 'expenses');
    }
    
    toast.success(`تم تسجيل المصروف: ${amount.toFixed(3)} TND`);
  };

  const handleDeleteExpense = async (id: string) => {
    await expensesHook.deleteExpense(id);
    toast.success('تم حذف المصروف');
  };

  const handleAddCustomer = async (customerData: { name: string; phone: string }) => {
    const customer = await customers.addCustomer(customerData);
    if (customer) {
      toast.success(`تم إضافة العميل ${customerData.name}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        lowStockCount={products.lowStockProducts.length}
        kioskName={settings.kioskName}
        kioskNameFr={settings.kioskNameFr}
        logo={settings.logo}
      />

      {/* Low Stock Notification */}
      <LowStockNotification products={products.lowStockProducts} />
      
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartItemCount={cart.itemCount}
      />
      
      <main className="flex-1 overflow-auto">
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
            loading={products.loading}
            kioskName={settings.kioskName}
            kioskNameFr={settings.kioskNameFr}
            allProducts={products.products}
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
            onAddProduct={products.addProduct}
            loading={products.loading}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchasesTab
            products={products.products}
            currentItems={purchases.currentItems}
            currentTotal={purchases.currentTotal}
            invoiceNumber={purchases.invoiceNumber}
            onSetInvoiceNumber={purchases.setInvoiceNumber}
            onAddItem={purchases.addItemToPurchase}
            onUpdateQuantity={purchases.updateItemQuantity}
            onUpdateCost={purchases.updateItemCost}
            onRemoveItem={purchases.removeItem}
            onSavePurchase={handleSavePurchase}
            onUpdateStock={products.updateStock}
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
          <ReportsTab 
            sales={salesHook.sales} 
            purchases={purchases.purchases}
            expenses={expensesHook.expenses}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expensesHook.expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            monthTotal={expensesHook.getMonthExpenses().reduce((sum, e) => sum + e.amount, 0)}
            todayTotal={expensesHook.getTodayExpenses().reduce((sum, e) => sum + e.amount, 0)}
          />
        )}

        {activeTab === 'cashbox' && (
          <CashBoxTab
            balance={cashBox.balance}
            transactions={cashBox.transactions}
            settings={cashBox.settings}
            onAddTransaction={cashBox.addTransaction}
            onUpdateSettings={cashBox.updateSettings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={updateSettings}
            onResetSettings={resetSettings}
          />
        )}
      </main>

    </div>
  );
};

export default Index;
