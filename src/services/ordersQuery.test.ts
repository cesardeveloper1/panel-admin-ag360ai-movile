import { describe, expect, it } from 'vitest';
import type { Brand } from '../types';
import { buildOrdersQueryString, defaultOrdersFilters } from './ordersQuery';

const brand: Brand = {
  id: 'smash',
  initials: 'SB',
  nameKey: 'brands.custom',
  displayName: 'Smash',
  subdomain: 'smashburger',
  locations: 1,
  ordersToday: 0,
};

describe('buildOrdersQueryString', () => {
  it('usa dateFrom/dateTo para hoy (default)', () => {
    const q = buildOrdersQueryString(brand, defaultOrdersFilters(new Date('2026-08-08T15:00:00')));
    const params = new URLSearchParams(q);
    expect(params.get('subdomains')).toBe('smashburger');
    expect(params.get('dateFrom')).toBe('2026-08-08');
    expect(params.get('dateTo')).toBe('2026-08-08');
    expect(params.get('last12Hours')).toBeNull();
    expect(params.get('limit')).toBe('150');
  });

  it('usa last12Hours sin fechas', () => {
    const q = buildOrdersQueryString(brand, { dateMode: 'last12Hours', limit: 100 });
    const params = new URLSearchParams(q);
    expect(params.get('last12Hours')).toBe('true');
    expect(params.get('dateFrom')).toBeNull();
    expect(params.get('dateTo')).toBeNull();
  });

  it('ordena rango invertido y añade search', () => {
    const q = buildOrdersQueryString(brand, {
      dateMode: 'range',
      dateFrom: '2026-08-10',
      dateTo: '2026-08-08',
      search: ' diego ',
    });
    const params = new URLSearchParams(q);
    expect(params.get('dateFrom')).toBe('2026-08-08');
    expect(params.get('dateTo')).toBe('2026-08-10');
    expect(params.get('search')).toBe('diego');
  });
});
