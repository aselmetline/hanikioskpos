/**
 * Conflict resolution for product / stock edits made offline.
 *
 * Policy:
 *  - stock  → relative merge. Offline edits are stored as a delta and re-applied
 *             on top of whatever the server has now, so concurrent sales or
 *             restocks from other devices are never overwritten.
 *  - other  → last-write-wins per field, but only if the server value has NOT
 *    fields   changed since the local baseline. If another device changed the
 *             same field after our offline edit, the server value wins and the
 *             conflict is reported to the user.
 */

export type ProductFieldPatch = Record<string, unknown>;

export interface ConflictInfo {
  productId: string;
  field: string;
  localValue: unknown;
  serverValue: unknown;
  winner: 'local' | 'server';
}

export interface MergeInput {
  productId: string;
  /** Fields the user changed offline (db column names). */
  fields: ProductFieldPatch;
  /** Snapshot of those fields as they were before the offline edit. */
  base: ProductFieldPatch;
  /** Net stock change made offline (positive = added, negative = consumed). */
  stockDelta?: number;
  /** When the offline edit happened (ISO). */
  editedAt: string;
  /** Current server row. */
  server: Record<string, unknown> & { updated_at?: string; stock?: number };
}

export interface MergeResult {
  /** Patch to send to the server (empty = nothing left to write). */
  patch: ProductFieldPatch;
  conflicts: ConflictInfo[];
}

const isEqual = (a: unknown, b: unknown) => {
  if (a === b) return true;
  if (typeof a === 'number' || typeof b === 'number') {
    return Number(a) === Number(b);
  }
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
};

export function mergeProductMutation(input: MergeInput): MergeResult {
  const { fields, base, stockDelta, editedAt, server, productId } = input;
  const conflicts: ConflictInfo[] = [];
  const patch: ProductFieldPatch = {};

  const serverUpdatedAt = server.updated_at ? Date.parse(server.updated_at) : 0;
  const localEditedAt = Date.parse(editedAt) || 0;
  const serverIsNewer = serverUpdatedAt > localEditedAt;

  for (const [field, localValue] of Object.entries(fields)) {
    if (field === 'stock') continue; // handled as a delta below
    const serverValue = server[field];
    const baseValue = base[field];

    if (isEqual(serverValue, localValue)) continue; // already applied

    const serverChanged = !isEqual(serverValue, baseValue);

    if (serverChanged && serverIsNewer) {
      // Another device edited the same field more recently → keep server value.
      conflicts.push({ productId, field, localValue, serverValue, winner: 'server' });
      continue;
    }

    patch[field] = localValue;
    if (serverChanged) {
      conflicts.push({ productId, field, localValue, serverValue, winner: 'local' });
    }
  }

  if (stockDelta) {
    const serverStock = Number(server.stock ?? 0);
    const merged = Math.max(0, serverStock + stockDelta);
    if (merged !== serverStock) patch.stock = merged;
    const baseStock = Number(base.stock ?? serverStock);
    if (!isEqual(serverStock, baseStock)) {
      // Stock moved elsewhere too — we merged instead of overwriting.
      conflicts.push({
        productId,
        field: 'stock',
        localValue: baseStock + stockDelta,
        serverValue: merged,
        winner: 'local',
      });
    }
  }

  return { patch, conflicts };
}
