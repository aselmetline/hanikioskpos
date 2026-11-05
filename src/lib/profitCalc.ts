import { baseId, isSubId, pieceCost } from '@/lib/subUnits';
import type { Sale, Product, Customer } from '@/types/pos';

/** Round to millimes (3 decimals) to avoid float drift. */
export const r3 = (v: number) => Math.round(v * 1000) / 1000;

export interface ProfitRow {
  key: string;
  label: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // %
  extra?: string;
}

/** Direct margin = (sale price − purchase cost) × quantity. */
export function lineFigures(item: Sale['items'][number], costOf: (id: string, name: string) => number) {
  const revenue = item.product.price * item.quantity - (item.discount || 0);
  const cost = costOf(item.product.id, item.product.name) * item.quantity;
  return { revenue, cost, profit: revenue - cost };
}

export function makeCostLookup(products: Product[]) {
  const byId = new Map(products.map(p => [p.id, p]));
  const byName = new Map(products.map(p => [p.name, p]));
  return (id: string, name: string) => {
    if (isSubId(id)) {
      const parent = byId.get(baseId(id));
      return parent ? pieceCost(parent.cost ?? 0, parent.subUnitsCount ?? 0) : 0;
    }
    return (byId.get(id) ?? byName.get(name))?.cost ?? 0;
  };
}

function finalize(map: Map<string, ProfitRow>): ProfitRow[] {
  return [...map.values()]
    .map(r => ({
      ...r,
      revenue: r3(r.revenue),
      cost: r3(r.cost),
      profit: r3(r.profit),
      margin: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
}

function add(map: Map<string, ProfitRow>, key: string, label: string, qty: number, f: { revenue: number; cost: number; profit: number }, extra?: string) {
  const row = map.get(key) ?? { key, label, qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0, extra };
  row.qty += qty; row.revenue += f.revenue; row.cost += f.cost; row.profit += f.profit;
  map.set(key, row);
}

export function byProduct(sales: Sale[], products: Product[], ar: boolean) {
  const costOf = makeCostLookup(products);
  const pMap = new Map(products.map(p => [p.id, p]));
  const map = new Map<string, ProfitRow>();
  sales.forEach(s => s.items.forEach(it => {
    const p = pMap.get(it.product.id);
    const label = p ? (ar ? p.nameAr || p.name : p.name) : it.product.name;
    add(map, it.product.id || it.product.name, label, it.quantity, lineFigures(it, costOf));
  }));
  return finalize(map);
}

export function byCategory(sales: Sale[], products: Product[], catLabel: (id: string) => string) {
  const costOf = makeCostLookup(products);
  const pMap = new Map(products.map(p => [p.id, p]));
  const map = new Map<string, ProfitRow>();
  sales.forEach(s => s.items.forEach(it => {
    const cat = pMap.get(it.product.id)?.category || 'other';
    add(map, cat, catLabel(cat), it.quantity, lineFigures(it, costOf));
  }));
  return finalize(map);
}

/** Invoice profit = sum of line profits − invoice-level discount. */
export function byInvoice(sales: Sale[], products: Product[]) {
  const costOf = makeCostLookup(products);
  const map = new Map<string, ProfitRow>();
  sales.forEach(s => {
    let revenue = 0, cost = 0, qty = 0;
    s.items.forEach(it => { const f = lineFigures(it, costOf); revenue += f.revenue; cost += f.cost; qty += it.quantity; });
    revenue -= s.discount || 0;
    const label = s.invoiceNumber ? `#${s.invoiceNumber}` : s.id.slice(0, 8);
    map.set(s.id, { key: s.id, label, qty, revenue, cost, profit: revenue - cost, margin: 0, extra: new Date(s.createdAt).toISOString() });
  });
  return finalize(map);
}

export function byCustomer(sales: Sale[], products: Product[], customers: Customer[], walkIn: string) {
  const costOf = makeCostLookup(products);
  const cMap = new Map(customers.map(c => [c.id, c]));
  const map = new Map<string, ProfitRow>();
  sales.forEach(s => {
    const c = s.customerId ? cMap.get(s.customerId) : undefined;
    const key = c?.id || '_walkin';
    s.items.forEach(it => add(map, key, c?.name || walkIn, it.quantity, lineFigures(it, costOf), c ? String(c.creditBalance) : undefined));
  });
  return finalize(map);
}

export function capital(products: Product[]) {
  let costValue = 0, saleValue = 0, units = 0;
  products.forEach(p => {
    const q = Math.max(0, p.stock);
    units += q; costValue += (p.cost ?? 0) * q; saleValue += p.price * q;
  });
  return { units, costValue: r3(costValue), saleValue: r3(saleValue), expectedProfit: r3(saleValue - costValue) };
}

/** Zakat base = stock at cost + cash + collectable customer debts − supplier debts; 2.5% if base ≥ nisab. */
export function zakat(input: { stockCost: number; cash: number; receivables: number; payables: number; nisab: number }) {
  const base = r3(input.stockCost + input.cash + input.receivables - input.payables);
  const due = base >= input.nisab && base > 0 ? r3(base * 0.025) : 0;
  return { base, due, reached: base >= input.nisab && base > 0 };
}
