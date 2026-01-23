export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  category: string;
  barcode?: string;
  image?: string;
  stock: number;
  unit: string;
  lowStockAlert: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  creditBalance: number;
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
