import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all rows from a Supabase table, paginating past the 1000-row limit.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  options?: {
    select?: string;
    filters?: { column: string; value: string }[];
    order?: { column: string; ascending?: boolean };
    inFilter?: { column: string; values: string[] };
  }
): Promise<{ data: T[]; error: Error | null }> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(options?.select || '*');

    if (options?.filters) {
      for (const f of options.filters) {
        query = query.eq(f.column, f.value);
      }
    }

    if (options?.inFilter) {
      query = query.in(options.inFilter.column, options.inFilter.values);
    }

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? false });
    }

    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      return { data: allData, error: new Error(error.message) };
    }

    allData = allData.concat(data as T[]);
    hasMore = (data as T[]).length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return { data: allData, error: null };
}
