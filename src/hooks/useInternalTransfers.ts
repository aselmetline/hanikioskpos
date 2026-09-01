import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { tx } from '@/i18n/t';

export interface InternalTransfer {
  id: string;
  sourceProductId: string | null;
  sourceProductName: string;
  sourceQuantity: number;
  sourceUnitValue: number;
  sourceTotalValue: number;
  targetProductId: string | null;
  targetProductName: string;
  targetUnitPrice: number;
  targetQuantity: number;
  remainderValue: number;
  notes?: string;
  createdAt: Date;
}

function mapRow(r: any): InternalTransfer {
  return {
    id: r.id,
    sourceProductId: r.source_product_id,
    sourceProductName: r.source_product_name,
    sourceQuantity: r.source_quantity,
    sourceUnitValue: Number(r.source_unit_value),
    sourceTotalValue: Number(r.source_total_value),
    targetProductId: r.target_product_id,
    targetProductName: r.target_product_name,
    targetUnitPrice: Number(r.target_unit_price),
    targetQuantity: r.target_quantity,
    remainderValue: Number(r.remainder_value),
    notes: r.notes || undefined,
    createdAt: new Date(r.created_at),
  };
}

export function useInternalTransfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = useCallback(async () => {
    if (!user) {
      setTransfers([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('internal_transfers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('Error fetching internal transfers:', error);
    } else {
      setTransfers((data || []).map(mapRow));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchTransfers();
  }, [fetchTransfers]);

  /** Executes the internal conversion atomically on the server. */
  const createTransfer = useCallback(
    async (sourceProductId: string, sourceQuantity: number, targetProductId: string, notes?: string) => {
      const { data, error } = await supabase.rpc('process_internal_transfer', {
        p_source_product_id: sourceProductId,
        p_source_quantity: sourceQuantity,
        p_target_product_id: targetProductId,
        p_notes: notes || null,
      });

      if (error) {
        console.error('Internal transfer failed:', error);
        toast.error(error.message || tx('transfers.failed'));
        return null;
      }

      await fetchTransfers();
      return data as {
        transfer_id: string;
        source_total_value: number;
        target_quantity: number;
        remainder_value: number;
      };
    },
    [fetchTransfers],
  );

  const deleteTransfer = useCallback(async (id: string) => {
    const { error } = await supabase.from('internal_transfers').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTransfers(prev => prev.filter(t => t.id !== id));
  }, []);

  return { transfers, loading, createTransfer, deleteTransfer, refetch: fetchTransfers };
}
