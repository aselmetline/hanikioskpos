export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  cost?: number;
  category: string;
  barcode?: string;
  image?: string;
  stock: number;
  unit: string;
  lowStockAlert: number;
  /** VAT rate as decimal (0, 0.07, 0.13, 0.19). Defaults to 0.19 (Tunisia) */
  taxRate?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface Customer {
  id: string;
  externalId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  notes?: string;
  creditLimit: number;
  points: number;
  creditBalance: number;
  openingDebtBalance: number;
  createdAt: Date;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
}

export interface Sale {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'credit';
  customerId?: string;
  createdAt: Date;
  invoiceNumber?: number | null;
  fiscalStamp?: number;
  taxBreakdown?: Record<string, { base: number; tax: number }>;
  /** True when the sale was recorded offline and is awaiting sync. */
  pendingSync?: boolean;
}

export interface DailyReport {
  date: Date;
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  creditSales: number;
  profit: number;
}

export type Category = {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
};

export interface CashBoxTransaction {
  id: string;
  type: 'add' | 'deduct';
  amount: number;
  description: string;
  date: Date;
  category: 'manual' | 'sales' | 'purchases' | 'expenses';
}

export interface CashBoxSettings {
  autoAddSales: boolean;
  autoDeductPurchases: boolean;
  autoDeductExpenses: boolean;
}

export interface PurchaseItem {
  product: Product;
  cost: number;
  quantity: number;
  total: number;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  items: PurchaseItem[];
  total: number;
  supplierId?: string;
  supplierName?: string;
  createdAt: Date;
}

// Expense types
export type ExpenseCategory = 'electricity' | 'rent' | 'salaries' | 'supplies' | 'maintenance' | 'transport' | 'other';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: Date;
  createdAt: Date;
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; labelFr: string; icon: string }[] = [
  { id: 'electricity', label: 'كهرباء', labelFr: 'Électricité', icon: '⚡' },
  { id: 'rent', label: 'إيجار', labelFr: 'Loyer', icon: '🏠' },
  { id: 'salaries', label: 'رواتب', labelFr: 'Salaires', icon: '👷' },
  { id: 'supplies', label: 'لوازم', labelFr: 'Fournitures', icon: '📦' },
  { id: 'maintenance', label: 'صيانة', labelFr: 'Maintenance', icon: '🔧' },
  { id: 'transport', label: 'نقل', labelFr: 'Transport', icon: '🚗' },
  { id: 'other', label: 'أخرى', labelFr: 'Autres', icon: '📋' },
];

export const TAX_RATE = 0.19;
