/**
 * Replays queued offline product/stock edits against the server, resolving
 * conflicts with changes that other devices made to the same rows.
 */

import { supabase } from '@/integrations/supabase/client';
import { mergeProductMutation, type ConflictInfo } from './conflictResolver';
import {
  markMutationAttempt,
  readMutations,
  removeMutation,
  type PendingMutation,
} from './offlineMutations';
import { isNetworkError } from './offlineQueue';

export interface MutationSyncResult {
  applied: number;
  failed: number;
  conflicts: ConflictInfo[];
  stoppedOffline: boolean;
}

const MAX_ATTEMPTS = 3;

export async function syncProductMutations(userId: string): Promise<MutationSyncResult> {
  const result: MutationSyncResult = { applied: 0, failed: 0, conflicts: [], stoppedOffline: false };
  const queue = readMutations().filter((m: PendingMutation) => m.userId === userId);
  if (queue.length === 0) return result;

  for (const entry of queue) {
    try {
      if (entry.kind === 'delete') {
        const { error } = await supabase.from('products').delete().eq('id', entry.productId);
        if (error) throw error;
        removeMutation(entry.localId);
        result.applied++;
        continue;
      }

      const { data: server, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', entry.productId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!server) {
        // Row was deleted on another device — drop the local edit.
        removeMutation(entry.localId);
        result.conflicts.push({
          productId: entry.productId,
          field: 'row',
          localValue: entry.fields,
          serverValue: null,
          winner: 'server',
        });
        continue;
      }

      const { patch, conflicts } = mergeProductMutation({
        productId: entry.productId,
        fields: entry.fields,
        base: entry.base,
        stockDelta: entry.stockDelta,
        editedAt: entry.editedAt,
        server: server as Record<string, unknown>,
      });

      result.conflicts.push(...conflicts);

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from('products').update(patch).eq('id', entry.productId);
        if (error) throw error;
      }

      removeMutation(entry.localId);
      result.applied++;
    } catch (error) {
      const message = (error as { message?: string })?.message ?? 'unknown error';
      if (isNetworkError(error)) {
        markMutationAttempt(entry.localId, message);
        result.stoppedOffline = true;
        break;
      }
      markMutationAttempt(entry.localId, message);
      if (entry.attempts + 1 >= MAX_ATTEMPTS) {
        removeMutation(entry.localId);
        result.failed++;
      }
    }
  }

  return result;
}
