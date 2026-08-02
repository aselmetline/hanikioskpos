import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { tx } from '@/i18n/t';
import { readMutations } from '@/lib/offlineMutations';
import {
  PendingSale,
  isNetworkError,
  markAttempt,
  readQueue,
  removeFromQueue,
  subscribeQueue,
} from '@/lib/offlineQueue';
import { triggerRevalidate } from '@/lib/cacheRevalidate';
import { subscribeMutations, type PendingMutation } from '@/lib/offlineMutations';
import { syncProductMutations } from '@/lib/offlineMutationSync';

/**
 * Watches connectivity and replays sales that were recorded while offline.
 */
export const useOfflineSync = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingSale[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [syncing, setSyncing] = useState(false);

  const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>([]);

  useEffect(() => subscribeQueue(setPending), []);
  useEffect(() => subscribeMutations(setPendingMutations), []);

  const sync = useCallback(async () => {
    if (!user) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = readQueue().filter((s) => s.userId === user.id);
    const mutations = readMutations().filter((m) => m.userId === user.id);
    if (queue.length === 0 && mutations.length === 0) return;

    setSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const entry of queue) {
      const { error } = await supabase.rpc('process_sale', entry.payload as never);
      if (error) {
        if (isNetworkError(error)) {
          markAttempt(entry.localId, error.message);
          break; // still offline — keep the rest queued
        }
        // Server rejected the sale (stock, credit limit...) — don't retry forever
        markAttempt(entry.localId, error.message);
        if (entry.attempts + 1 >= 3) {
          removeFromQueue(entry.localId);
          failed++;
        }
        continue;
      }
      removeFromQueue(entry.localId);
      synced++;
    }

    // Replay product/stock edits made offline, merging with other devices' changes.
    const mutationResult = await syncProductMutations(user.id);

    setSyncing(false);
    if (synced > 0) {
      toast.success(`${tx('offline.synced')} (${synced})`);
    }
    if (failed > 0) toast.error(`${tx('offline.syncFailed')} (${failed})`);
    if (mutationResult.applied > 0) {
      toast.success(`${tx('offline.editsSynced')} (${mutationResult.applied})`);
    }
    if (mutationResult.failed > 0) {
      toast.error(`${tx('offline.editsFailed')} (${mutationResult.failed})`);
    }
    if (mutationResult.conflicts.length > 0) {
      const serverWins = mutationResult.conflicts.filter((c) => c.winner === 'server').length;
      toast.warning(`${tx('offline.conflictsResolved')} (${mutationResult.conflicts.length})`, {
        description: serverWins > 0 ? tx('offline.conflictServerWins') : undefined,
      });
    }
    if (synced > 0 || mutationResult.applied > 0 || mutationResult.conflicts.length > 0) {
      // Pull fresh server state (stock, points, balances) after replaying.
      triggerRevalidate();
    }
  }, [user]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Attempt a sync on mount and periodically while there is a backlog.
    sync();
    const interval = setInterval(() => {
      if (navigator.onLine) sync();
    }, 60_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [sync]);

  return {
    pendingCount:
      pending.filter((s) => !user || s.userId === user.id).length +
      pendingMutations.filter((m) => !user || m.userId === user.id).length,
    pendingSales: pending,
    isOnline,
    syncing,
    sync,
  };
};
