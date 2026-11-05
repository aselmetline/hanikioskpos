import type { Product } from '@/types/pos';
import { roundQuantity } from '@/lib/quantity';

/** Cart/sale line id suffix marking a sub-unit (e.g. single cigarette) line. */
export const SUB_SUFFIX = '::sub';

export const isSubId = (id: string) => id.endsWith(SUB_SUFFIX);
export const baseId = (id: string) => (isSubId(id) ? id.slice(0, -SUB_SUFFIX.length) : id);

export const hasSubUnits = (p: Product) =>
  !!p.hasSubUnits && (p.subUnitsCount ?? 0) > 0 && (p.subUnitPrice ?? 0) > 0;

/** Pieces available = closed packs × count + loose pieces. */
export const totalPieces = (p: Product) =>
  Math.floor(p.stock) * (p.subUnitsCount ?? 0) + (p.looseStock ?? 0);

/** Unit cost of one piece = pack cost ÷ pieces per pack. */
export const pieceCost = (packCost: number, count: number) =>
  count > 0 ? roundQuantity(packCost / count) : 0;

/** Virtual product representing one piece of a pack, used as a cart line. */
export function makeSubUnitProduct(p: Product): Product {
  const count = p.subUnitsCount ?? 0;
  const name = p.subUnitName || 'سيجارة';
  return {
    ...p,
    id: p.id + SUB_SUFFIX,
    nameAr: `${p.nameAr} (${name})`,
    name: `${p.name} (${name})`,
    price: p.subUnitPrice ?? 0,
    cost: p.cost ? pieceCost(p.cost, count) : undefined,
    price2: undefined,
    price3: undefined,
    stock: totalPieces(p),
    unit: name,
    isOpenPrice: false,
  };
}

/** Extra margin when a full pack is sold piece by piece. */
export const packSplitMargin = (packPrice: number, count: number, piecePrice: number) =>
  roundQuantity(count * piecePrice - packPrice);
