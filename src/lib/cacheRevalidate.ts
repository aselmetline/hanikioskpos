/**
 * Smart revalidation policy for the offline IndexedDB cache.
 *
 * Data hooks (products/stock, customers, settings) register a refetch function.
 * They are re-run automatically when:
 *  - the browser regains connectivity ("online")
 *  - the tab becomes visible again while online
 *  - the cached data becomes stale (TTL) while the tab is open and online
 *  - the offline sale queue finishes syncing (manual trigger)
 *
 * Refreshes are debounced per subscriber so a burst of events costs one fetch.
 */

export const STALE_AFTER_MS = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_MS = 800;
const TICK_MS = 60_000;

type Revalidator = () => void | Promise<void>;

const subscribers = new Set<{ run: Revalidator; last: number }>();
let listenersBound = false;
let tick: ReturnType<typeof setInterval> | null = null;

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

function runAll(force = false) {
  if (!isOnline()) return;
  const now = Date.now();
  subscribers.forEach((sub) => {
    if (!force && now - sub.last < DEBOUNCE_MS) return;
    sub.last = now;
    try {
      void sub.run();
    } catch (e) {
      console.error('Cache revalidation failed', e);
    }
  });
}

function bindListeners() {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;

  window.addEventListener('online', () => runAll(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') runAll();
  });
  window.addEventListener(REVALIDATE_EVENT, () => runAll(true));

  tick = setInterval(() => runAll(), TICK_MS);
}

export const REVALIDATE_EVENT = 'pos:cache-revalidate';

/** Ask every registered hook to refresh from the server (if online). */
export function triggerRevalidate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REVALIDATE_EVENT));
}

/** Registers a refetch function. Returns an unsubscribe callback. */
export function subscribeRevalidate(run: Revalidator): () => void {
  bindListeners();
  // `last` starts in the past so the first event always fires.
  const sub = { run, last: 0 };
  subscribers.add(sub);
  return () => {
    subscribers.delete(sub);
    if (subscribers.size === 0 && tick) {
      clearInterval(tick);
      tick = null;
      listenersBound = false;
    }
  };
}

/** True when a cache envelope timestamp is older than the TTL. */
export function isStale(updatedAt?: string | null, ttl = STALE_AFTER_MS) {
  if (!updatedAt) return true;
  const t = new Date(updatedAt).getTime();
  return Number.isNaN(t) || Date.now() - t > ttl;
}
