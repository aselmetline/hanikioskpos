// Offline sales queue: persists pending sales locally and replays them once online.

export interface PendingSalePayload {
  p_items: Array<{
    product_id: string | null;
    product_name: string;
    price: number;
    quantity: number;
    discount: number;
    tax_rate: number;
  }>;
  p_subtotal: number;
  p_tax: number;
  p_discount: number;
  p_total: number;
  p_payment_method: 'cash' | 'credit';
  p_customer_id: string | null;
  p_points_to_redeem: number;
  p_auto_add_to_cashbox: boolean;
  p_points_per_dinar: number;
}

export interface PendingSale {
  /** Local-only id (also used as the local sale id shown on the receipt). */
  localId: string;
  createdAt: string;
  userId: string;
  payload: PendingSalePayload;
  attempts: number;
  lastError?: string;
}

const STORAGE_KEY = 'offline_pending_sales';

type Listener = (queue: PendingSale[]) => void;
const listeners = new Set<Listener>();

export function readQueue(): PendingSale[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingSale[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingSale[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to persist offline queue', e);
  }
  listeners.forEach((l) => l(queue));
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  listener(readQueue());
  return () => listeners.delete(listener);
}

export function enqueueSale(userId: string, payload: PendingSalePayload): PendingSale {
  const entry: PendingSale = {
    localId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    userId,
    payload,
    attempts: 0,
  };
  writeQueue([...readQueue(), entry]);
  return entry;
}

export function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter((s) => s.localId !== localId));
}

export function markAttempt(localId: string, error: string) {
  writeQueue(
    readQueue().map((s) =>
      s.localId === localId ? { ...s, attempts: s.attempts + 1, lastError: error } : s,
    ),
  );
}

export function clearQueue() {
  writeQueue([]);
}

/** True when the failure is a connectivity problem (worth retrying later). */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? '';
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('timeout')
  );
}
