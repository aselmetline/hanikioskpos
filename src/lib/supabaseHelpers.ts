import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches all rows from a query by paginating through the 1000-row limit.
 * Usage: pass a query builder function that returns a Supabase query with .range() applied.
 */
export async function fetchAllPaginated<T>(
  queryFn: (from: number, to: number) => ReturnType<ReturnType<typeof supabase.from>['select']>
): Promise<{ data: T[]; error: unknown }> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1);
    if (error) return { data: allData, error };
    const rows = (data || []) as T[];
    allData = allData.concat(rows);
    hasMore = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return { data: allData, error: null };
}
