/**
 * Deterministic Customer ID generator.
 *
 * Properties:
 *  1. Deterministic — نفس الإدخال يُنتج دائمًا نفس المعرف.
 *  2. Unique — مع دعم لاحقة تمييز للتكرارات (collision suffix).
 *  3. Multi-source — يعمل مع QR / code / name.
 *  4. Case & diacritics insensitive للأسماء (عربي + لاتيني).
 *  5. Stable across time — لا يعتمد على الوقت/العشوائية.
 *
 * Output format: `cust_<token>` (lowercase, ASCII-safe).
 */

export type CustomerIdInputType = 'qr' | 'code' | 'name';

export interface CustomerIdInput {
  type: CustomerIdInputType;
  value: string;
}

const PREFIX = 'cust_';

/** Arabic diacritics (tashkeel) + tatweel. */
const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Normalize Arabic letters that are visually/semantically equivalent. */
function normalizeArabic(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ → ا
    .replace(/\u0649/g, '\u064A') // ى → ي
    .replace(/\u0629/g, '\u0647') // ة → ه
    .replace(/\u0624/g, '\u0648') // ؤ → و
    .replace(/\u0626/g, '\u064A'); // ئ → ي
}

/** Canonicalize a name: lower-case, strip diacritics, collapse whitespace. */
function canonicalizeName(name: string): string {
  const nfkd = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const arabicNorm = normalizeArabic(nfkd);
  return arabicNorm
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Canonicalize a code/QR: trim, lower, strip non-alphanumerics. */
function canonicalizeCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Deterministic 64-bit FNV-1a hash → hex string (12 chars).
 * Stable, no crypto dependency, safe for client/server.
 */
function fnv1a64Hex(str: string): string {
  // FNV offset basis & prime as BigInt (64-bit).
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0').slice(0, 12);
}

/**
 * Build the base (collision-free) customer ID from raw input.
 * For `qr` / `code` we keep the canonical value visible (after `cust_`)
 * to match the requested examples, and fall back to a hash if too long
 * or non-ASCII. For `name` we always hash.
 */
export function buildBaseCustomerId(input: CustomerIdInput): string {
  const value = (input.value ?? '').toString();
  if (!value.trim()) {
    throw new Error('Customer ID input value cannot be empty');
  }

  if (input.type === 'name') {
    const canonical = canonicalizeName(value);
    return `${PREFIX}${fnv1a64Hex('name:' + canonical)}`;
  }

  const canonical = canonicalizeCode(value);
  if (!canonical) {
    // Pure-symbol input → fall back to hash of the raw value.
    return `${PREFIX}${fnv1a64Hex(input.type + ':' + value.trim().toLowerCase())}`;
  }
  if (canonical.length <= 24) {
    return `${PREFIX}${canonical}`;
  }
  return `${PREFIX}${fnv1a64Hex(input.type + ':' + canonical)}`;
}

/**
 * Generate a unique customer ID, appending a deterministic suffix
 * (`_2`, `_3`, …) when the base ID is already taken by a *different* customer.
 *
 * @param input            القيمة المُدخلة (qr | code | name).
 * @param isTaken          دالة تتحقق إن كان المعرف مستعملًا فعلاً.
 *                         تعيد true إذا كان المعرف موجودًا لعميل آخر.
 * @returns Promise<string> المعرف الفريد النهائي.
 */
export async function generateUniqueCustomerId(
  input: CustomerIdInput,
  isTaken: (candidateId: string) => boolean | Promise<boolean>,
): Promise<string> {
  const base = buildBaseCustomerId(input);
  if (!(await isTaken(base))) return base;
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base}_${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('Unable to generate unique customer ID after 10000 attempts');
}

/** Synchronous variant when the caller already has the in-memory set. */
export function generateUniqueCustomerIdSync(
  input: CustomerIdInput,
  takenIds: Set<string>,
): string {
  const base = buildBaseCustomerId(input);
  if (!takenIds.has(base)) return base;
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base}_${n}`;
    if (!takenIds.has(candidate)) return candidate;
  }
  throw new Error('Unable to generate unique customer ID after 10000 attempts');
}
