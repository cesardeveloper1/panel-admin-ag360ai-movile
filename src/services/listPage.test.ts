import { describe, expect, it } from 'vitest';
import { appendPage, parseListPage } from './listPage';

describe('paged operation contracts', () => {
  it('preserves nested order totals beyond the first 150 rows', () => {
    const first = parseListPage({ data: { data: Array.from({ length: 150 }, (_, id) => ({ id })), meta: { total: 151 } } }, 1, 150);
    const last = parseListPage<{ id: number }>({ data: { data: [{ id: 149 }, { id: 150 }], meta: { total: 151 } } }, 2, 150);
    expect(first.hasMore).toBe(true);
    expect(last.hasMore).toBe(false);
    expect(first.total).toBe(151);
    const merged = appendPage(first.data as { id: number }[], last.data, row => String(row.id));
    expect(merged).toHaveLength(151);
    expect(new Set(merged.map(row => row.id)).size).toBe(151);
  });

  it('does not turn an unknown total into zero or 150', () => {
    const result = parseListPage({ data: Array(150).fill({ id: 'x' }) }, 1, 150);
    expect(result.total).toBeUndefined();
    expect(result.hasMore).toBe(true);
  });

  it('uses the server page size when a requested limit is clamped', () => {
    expect(parseListPage({ data: [], meta: { page: 2, limit: 50, total: 151 } }, 2, 150).hasMore).toBe(true);
    expect(() => parseListPage({ data: [], meta: { page: 1 } }, 2, 150)).toThrow();
  });

  it('honors contact pagination and rejects server errors/malformed responses', () => {
    expect(parseListPage({ data: { data: [], meta: { pagination: { hasNextPage: false, totalItems: 0 } } } }, 1, 150))
      .toMatchObject({ data: [], hasMore: false, total: 0 });
    expect(() => parseListPage({ data: { type: 'ERROR', data: [] } }, 1, 150)).toThrow();
    expect(() => parseListPage({}, 1, 150)).toThrow();
  });
});
