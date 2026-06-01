import { Product, Category, Customer } from '@/types/pos';

export const categories: Category[] = [
  { id: 'daily', name: 'Daily', nameAr: 'يومي', icon: '🥛', color: 'bg-blue-100' },
  { id: 'drinks', name: 'Drinks', nameAr: 'مشروبات', icon: '🥤', color: 'bg-green-100' },
  { id: 'tobacco', name: 'Tobacco', nameAr: 'تبغ', icon: '🚬', color: 'bg-orange-100' },
  { id: 'school', name: 'School', nameAr: 'مدرسي', icon: '📚', color: 'bg-purple-100' },
  { id: 'oils', name: 'Oils', nameAr: 'زيوت', icon: '🛢️', color: 'bg-yellow-100' },
  { id: 'services', name: 'Services', nameAr: 'خدمات', icon: '📱', color: 'bg-pink-100' },
];

export const sampleProducts: Product[] = [
  // Daily products
  { id: '1', name: 'Milk 1L', nameAr: 'حليب 1 لتر', price: 1.850, category: 'daily', barcode: '6191234567890', stock: 50, unit: 'قطعة', lowStockAlert: 10 },
  { id: '2', name: 'Bread', nameAr: 'خبز', price: 0.250, category: 'daily', barcode: '6191234567891', stock: 100, unit: 'قطعة', lowStockAlert: 20 },
  { id: '3', name: 'Eggs 6pcs', nameAr: 'بيض 6 حبات', price: 2.500, category: 'daily', barcode: '6191234567892', stock: 30, unit: 'علبة', lowStockAlert: 5 },
  { id: '4', name: 'Butter', nameAr: 'زبدة', price: 3.200, category: 'daily', barcode: '6191234567893', stock: 25, unit: 'قطعة', lowStockAlert: 5 },
  
  // Drinks
  { id: '5', name: 'Coca Cola', nameAr: 'كوكا كولا', price: 1.500, category: 'drinks', barcode: '5449000000996', stock: 100, unit: 'قطعة', lowStockAlert: 20 },
  { id: '6', name: 'Water 1.5L', nameAr: 'ماء 1.5 لتر', price: 0.650, category: 'drinks', barcode: '6191234567894', stock: 200, unit: 'قطعة', lowStockAlert: 30 },
  { id: '7', name: 'Juice Orange', nameAr: 'عصير برتقال', price: 2.000, category: 'drinks', barcode: '6191234567895', stock: 50, unit: 'قطعة', lowStockAlert: 10 },
  
  // Tobacco
  { id: '8', name: 'Marlboro', nameAr: 'مارلبورو', price: 7.500, category: 'tobacco', barcode: '3838383838383', stock: 30, unit: 'علبة', lowStockAlert: 5 },
  { id: '9', name: '20 Mars', nameAr: '20 مارس', price: 4.000, category: 'tobacco', barcode: '6191234567896', stock: 40, unit: 'علبة', lowStockAlert: 10 },
  
  // School supplies
  { id: '10', name: 'Notebook', nameAr: 'دفتر', price: 1.500, category: 'school', barcode: '6191234567897', stock: 100, unit: 'قطعة', lowStockAlert: 20 },
  { id: '11', name: 'Pen Blue', nameAr: 'قلم أزرق', price: 0.500, category: 'school', barcode: '6191234567898', stock: 200, unit: 'قطعة', lowStockAlert: 50 },
  { id: '12', name: 'Pencil', nameAr: 'قلم رصاص', price: 0.350, category: 'school', barcode: '6191234567899', stock: 150, unit: 'قطعة', lowStockAlert: 30 },
  
  // Oils
  { id: '13', name: 'Shell Advance 2T', nameAr: 'شل أدفانس 2T', price: 12.000, category: 'oils', barcode: '8888888888888', stock: 20, unit: 'قطعة', lowStockAlert: 5 },
  { id: '14', name: 'Engine Oil 1L', nameAr: 'زيت محرك 1 لتر', price: 25.000, category: 'oils', barcode: '6191234567800', stock: 15, unit: 'قطعة', lowStockAlert: 3 },
  
  // Services
  { id: '15', name: 'Ooredoo 5 TND', nameAr: 'أوريدو 5 دينار', price: 5.000, category: 'services', stock: 999, unit: 'شحن', lowStockAlert: 0 },
  { id: '16', name: 'Ooredoo 10 TND', nameAr: 'أوريدو 10 دينار', price: 10.000, category: 'services', stock: 999, unit: 'شحن', lowStockAlert: 0 },
  { id: '17', name: 'Orange 5 TND', nameAr: 'أورنج 5 دينار', price: 5.000, category: 'services', stock: 999, unit: 'شحن', lowStockAlert: 0 },
  { id: '18', name: 'Telecom 10 TND', nameAr: 'تونس تيليكوم 10 دينار', price: 10.000, category: 'services', stock: 999, unit: 'شحن', lowStockAlert: 0 },
];

export const sampleCustomers: Customer[] = [
  { id: '1', name: 'أحمد بن علي', phone: '22123456', points: 150, creditBalance: 25.500, creditLimit: 0, createdAt: new Date('2024-01-15') },
  { id: '2', name: 'محمد الصالح', phone: '55987654', points: 80, creditBalance: 0, creditLimit: 0, createdAt: new Date('2024-02-20') },
  { id: '3', name: 'فاطمة الزهراء', phone: '99456789', points: 200, creditBalance: 15.000, creditLimit: 0, createdAt: new Date('2024-03-10') },
];

export const TAX_RATE = 0.19; // 19% TVA
export const CURRENCY = 'TND';
export const POINTS_PER_DINAR = 1; // 1 point per 1 TND spent
