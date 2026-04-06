export interface ExcelProduct {
  name: string;
  nameAr: string;
  price: number;
  cost?: number;
  category: string;
  barcode?: string;
  stock: number;
  unit: string;
  lowStockAlert: number;
}

export type ProgressCallback = (progress: number, message: string) => void;
