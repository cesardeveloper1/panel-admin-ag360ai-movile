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
  it('all dates clears hidden date limits, retaining real channel and authorized branch filters', () => {
    const params = new URLSearchParams(buildOrdersQueryString({ ...brand, timezone: 'America/Lima' }, {
      dateMode: 'all', dateFrom: '2020-01-01', dateTo: '2020-01-02', source: 2, branchId: 'authorized-local',
    }));
    expect(params.has('dateFrom')).toBe(false);
    expect(params.has('dateTo')).toBe(false);
    expect(params.has('last12Hours')).toBe(false);
    expect(params.get('sources')).toBe('2');
    expect(params.get('branchId')).toBe('authorized-local');
    expect(params.has('timezone')).toBe(false);
  });
  it('a selected day ignores a stale range end and allows future orders', () => {
    const params = new URLSearchParams(buildOrdersQueryString(brand, {
      dateMode: 'day', dateFrom: '2030-12-01', dateTo: '2020-01-01',
    }));
    expect(params.get('dateFrom')).toBe('2030-12-01');
    expect(params.get('dateTo')).toBe('2030-12-01');
  });

});
