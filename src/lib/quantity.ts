/** Shared thousandth-unit precision for stock, quantities and money. */
export const roundQuantity = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;
export const addQuantity = (left: number, right: number) => (Math.round(left * 1000) + Math.round(right * 1000)) / 1000;
export function parseQuantity(value: string | number): number {
  const normalized = String(value).trim().replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/[،٫,]/g, '.');
  if (!/^\d+(?:\.\d*)?$/.test(normalized)) return NaN;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed <= 9999999.999 ? roundQuantity(parsed) : NaN;
}
export const formatQuantity = (value: number) => String(roundQuantity(value));