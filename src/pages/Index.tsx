import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/pos/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav, TabType } from '@/components/pos/BottomNav';
import { SellTab } from '@/components/pos/SellTab';
import { InventoryTab } from '@/components/pos/InventoryTab';
import { CustomersTab } from '@/components/pos/CustomersTab';
import { ReportsTab } from '@/components/pos/ReportsTab';
import { SettingsTab } from '@/components/pos/SettingsTab';
import CashBoxTab from '@/components/pos/CashBoxTab';
import PurchasesTab from '@/components/pos/PurchasesTab';
import ExpensesTab from '@/components/pos/ExpensesTab';
import { QueriesTab } from '@/components/pos/QueriesTab';
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
import { exportFullBackup, importFullBackup } from '@/utils/excelUtils';

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('sell');

  const { settings, updateSettings, resetSettings } = useSettings();
  const cart = useCart(settings.taxRate, settings.taxEnabled);
  const customers = useCustomers();
  const products = useProducts();
  const cashBox = useCashBox();
  const purchases = usePurchases();
  const expensesHook = useExpenses();
  const salesHook = useSales();

  const handleCheckout = async (paymentMethod: 'cash' | 'credit', customer?: Customer, pointsToRedeem?: number): Promise<string | null> => {
    if (cart.items.length === 0) return null;

    // Calculate points discount
    const pointsDiscount = pointsToRedeem ? pointsToRedeem / customers.POINTS_TO_DINAR_RATE : 0;
    const saleTotal = cart.total - pointsDiscount;

    // Create sale in database
    const sale = await salesHook.createSale(
      cart.items,
      cart.subtotal,
      cart.tax,
      cart.globalDiscount + cart.itemsDiscount + pointsDiscount,
      saleTotal,
      paymentMethod,
      customer
    );

    if (!sale) return null;

    // Update stock
    for (const item of cart.items) {
      await products.updateStock(item.product.id, item.quantity);
    }

    // Redeem points if used
    if (customer && pointsToRedeem && pointsToRedeem > 0) {
      await customers.redeemPoints(customer.id, pointsToRedeem);
      toast.success(`تم استبدال ${pointsToRedeem} نقطة بخصم ${pointsDiscount.toFixed(3)} TND`);
    }

    // Auto-add to cash box if enabled and payment is cash
    if (paymentMethod === 'cash' && cashBox.settings.autoAddSales) {
      await cashBox.addTransaction('add', saleTotal, `مبيعات - ${cart.itemCount} منتج`, 'sales');
    }

    // Add points to customer (on final total after discount)
    if (customer) {
      const pointsAdded = await customers.addPoints(customer.id, saleTotal);
      if (paymentMethod === 'credit') {
        await customers.updateCreditBalance(customer.id, saleTotal);
      }
      if (pointsAdded > 0) {
        toast.success(`تم إضافة ${pointsAdded} نقطة جديدة لـ ${customer.name}`);
      }
    }

    cart.clearCart();
    
    toast.success(
      paymentMethod === 'cash' 
        ? `تم البيع بنجاح - ${saleTotal.toFixed(3)} TND` 
        : `تم تسجيل البيع الآجل - ${saleTotal.toFixed(3)} TND`
    );

    return sale.id;
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
      {/* Header + Navigation fixed at top */}
      <div className="sticky top-0 z-50">
        <Header 
          lowStockCount={products.lowStockProducts.length}
          kioskName={settings.kioskName}
          kioskNameFr={settings.kioskNameFr}
          logo={settings.logo}
        />
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          cartItemCount={cart.itemCount}
        />
      </div>

      {/* Low Stock Notification */}
      <LowStockNotification products={products.lowStockProducts} />
      
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
            pointsToDiscountRate={customers.POINTS_TO_DINAR_RATE}
            taxEnabled={settings.taxEnabled}
            taxRate={settings.taxRate}
            storePhone={settings.storePhone}
            storeAddress={[settings.storeAddressCity, settings.storeAddressArea, settings.storeAddressStreet].filter(Boolean).join('، ')}
            commercialRegister={settings.commercialRegister}
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
            onFetchPointsHistory={customers.getPointsHistory}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab 
            sales={salesHook.sales} 
            purchases={purchases.purchases}
            expenses={expensesHook.expenses}
          />
        )}

        {activeTab === 'queries' && (
          <QueriesTab 
            sales={salesHook.sales}
            purchases={purchases.purchases}
            expenses={expensesHook.expenses}
            transactions={cashBox.transactions}
            customers={customers.customers}
            cashBoxBalance={cashBox.balance}
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
            onFactoryReset={async () => {
              if (!user) return;
              const uid = user.id;
              
              // Get sale and purchase IDs first
              const [salesRes, purchasesRes] = await Promise.all([
                supabase.from('sales').select('id').eq('user_id', uid),
                supabase.from('purchases').select('id').eq('user_id', uid),
              ]);
              const saleIds = salesRes.data?.map(s => s.id) || [];
              const purchaseIds = purchasesRes.data?.map(p => p.id) || [];

              // Delete child records first
              if (saleIds.length > 0) await supabase.from('sale_items').delete().in('sale_id', saleIds);
              if (purchaseIds.length > 0) await supabase.from('purchase_items').delete().in('purchase_id', purchaseIds);

              // Delete parent/independent tables
              await Promise.all([
                supabase.from('sales').delete().eq('user_id', uid),
                supabase.from('purchases').delete().eq('user_id', uid),
                supabase.from('expenses').delete().eq('user_id', uid),
                supabase.from('points_transactions').delete().eq('user_id', uid),
                supabase.from('customers').delete().eq('user_id', uid),
                supabase.from('products').delete().eq('user_id', uid),
                supabase.from('cash_box_transactions').delete().eq('user_id', uid),
              ]);

              await resetSettings();
              toast.success('تم إعادة تهيئة التطبيق بنجاح');
              window.location.reload();
            }}
            onExportBackup={async (onProgress) => {
              if (!user) return;
              try {
                await exportFullBackup(user.id, onProgress);
                toast.success('تم تحميل النسخة الاحتياطية بنجاح');
              } catch {
                toast.error('فشل في تصدير النسخة الاحتياطية');
              }
            }}
            onImportBackup={async (file: File, onProgress) => {
              if (!user) return;
              try {
                const result = await importFullBackup(file, user.id, onProgress);
                if (result.imported.length > 0) {
                  toast.success(`تم استيراد: ${result.imported.join('، ')}`);
                  window.location.reload();
                } else {
                  toast.warning('لم يتم العثور على بيانات للاستيراد في الملف');
                }
              } catch {
                toast.error('فشل في استيراد النسخة الاحتياطية');
              }
            }}
          />
        )}
      </main>

    </div>
  );
};

export default Index;
