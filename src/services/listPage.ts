export interface ListPage<T> {
  data: T[];
  page: number;
  hasMore: boolean;
  total?: number;
}

/** Keep totals beside rows; unwrapApiPayload intentionally discards this metadata. */
export function parseListPage<T>(raw: unknown, page: number, limit: number, validatePage = true): ListPage<T> {
  let value = raw;
  let meta: Record<string, unknown> = {};
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(value)) {
      const pagination = (meta.pagination ?? meta) as Record<string, unknown>;
      const returnedPage = pagination.currentPage ?? pagination.page;
      if (validatePage && typeof returnedPage === 'number' && returnedPage !== page) throw new Error('Unexpected list page');
      const pageSize = typeof pagination.limit === 'number' && pagination.limit > 0 ? pagination.limit : limit;
      const totalValue = pagination.totalItems ?? pagination.total;
      const total = typeof totalValue === 'number' && Number.isFinite(totalValue) && totalValue >= 0
        ? totalValue : undefined;
      const hasMore = typeof pagination.hasNextPage === 'boolean'
        ? pagination.hasNextPage
        : total !== undefined ? page * pageSize < total
          : typeof pagination.totalPages === 'number' ? page < pagination.totalPages
            : value.length >= pageSize;
      return { data: value as T[], page, hasMore, total };
    }
    if (!value || typeof value !== 'object') break;
    const record = value as Record<string, unknown>;
    if (record.success === false || record.type === 'ERROR') throw new Error('List request failed');
    if (record.meta && typeof record.meta === 'object') meta = record.meta as Record<string, unknown>;
    value = record.data ?? record.orders;
  }
  throw new Error('Invalid list response');
}

export function appendPage<T>(previous: T[], incoming: T[], id: (item: T) => string): T[] {
  const result = new Map(previous.map(item => [id(item), item]));
  for (const item of incoming) result.set(id(item), item);
  return [...result.values()];
}
