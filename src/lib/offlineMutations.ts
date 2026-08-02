/**
 * Offline mutation queue for product / stock edits.
 *
 * Edits made without a connection are stored locally with the value they were
 * based on, then replayed with field-level conflict resolution once online.
 */

import type { ProductFieldPatch } from './conflictResolver';

export type MutationKind = 'update' | 'stock' | 'delete';

export interface PendingMutation {
  localId: string;
  userId: string;
  productId: string;
  kind: MutationKind;
  /** Fields changed offline (db column names). */
  fields: ProductFieldPatch;
  /** Values of those fields before the offline edit. */
  base: ProductFieldPatch;
  /** Net stock change (positive = added, negative = consumed). */
  stockDelta: number;
  editedAt: string;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = 'offline_pending_mutations';

type Listener = (queue: PendingMutation[]) => void;
const listeners = new Set<Listener>();

export function readMutations(): PendingMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingMutation[]) : [];
  } catch {
    return [];
  }
}

function write(queue: PendingMutation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to persist offline mutations', e);
  }
  listeners.forEach((l) => l(queue));
}

export function subscribeMutations(listener: Listener): () => void {
  listeners.add(listener);
  listener(readMutations());
  return () => listeners.delete(listener);
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mut-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Queues an offline edit. Successive edits to the same product are coalesced:
 * fields are merged, stock deltas accumulate and the original baseline is kept.
 */
export function enqueueMutation(params: {
  userId: string;
  productId: string;
  kind: MutationKind;
  fields?: ProductFieldPatch;
  base?: ProductFieldPatch;
  stockDelta?: number;
}): PendingMutation {
  const queue = readMutations();
  const existing = queue.find(
    (m) => m.productId === params.productId && m.userId === params.userId && m.kind !== 'delete',
  );

  if (params.kind === 'delete') {
    // A delete supersedes any pending edit for the same product.
    const entry: PendingMutation = {
      localId: newId(),
      userId: params.userId,
      productId: params.productId,
      kind: 'delete',
      fields: {},
      base: {},
      stockDelta: 0,
      editedAt: new Date().toISOString(),
      attempts: 0,
    };
    write([
      ...queue.filter((m) => !(m.productId === params.productId && m.userId === params.userId)),
      entry,
    ]);
    return entry;
  }

  if (existing) {
    const merged: PendingMutation = {
      ...existing,
      kind: existing.kind === 'stock' && params.kind === 'stock' ? 'stock' : 'update',
      fields: { ...existing.fields, ...(params.fields ?? {}) },
      base: { ...(params.base ?? {}), ...existing.base }, // keep the oldest baseline
      stockDelta: existing.stockDelta + (params.stockDelta ?? 0),
      editedAt: new Date().toISOString(),
    };
    write(queue.map((m) => (m.localId === existing.localId ? merged : m)));
    return merged;
  }

  const entry: PendingMutation = {
    localId: newId(),
    userId: params.userId,
    productId: params.productId,
    kind: params.kind,
    fields: params.fields ?? {},
    base: params.base ?? {},
    stockDelta: params.stockDelta ?? 0,
    editedAt: new Date().toISOString(),
    attempts: 0,
  };
  write([...queue, entry]);
  return entry;
}

export function removeMutation(localId: string) {
  write(readMutations().filter((m) => m.localId !== localId));
}

export function markMutationAttempt(localId: string, error: string) {
  write(
    readMutations().map((m) =>
      m.localId === localId ? { ...m, attempts: m.attempts + 1, lastError: error } : m,
    ),
  );
}

export function clearMutations() {
  write([]);
}
