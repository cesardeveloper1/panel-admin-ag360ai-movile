import type { Brand } from '../types';

/**
 * Filtros de listado alineados a panel
 * `buildOrdersQueryParams` (OrdersQueryMapper).
 */
export type OrdersDateMode = 'all' | 'today' | 'last12Hours' | 'day' | 'range';

export interface OrdersListFilters {
  dateMode: OrdersDateMode;
  /** YYYY-MM-DD — requerido salvo last12Hours */
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  source?: 1 | 2 | 5 | 6;
  branchId?: string;
  limit?: number;
  page?: number;
}

export function toLocalIsoDate(date: Date = new Date(), timezone?: string): string {
  if (timezone) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Default Operaciones: hoy calendario (pill “Hoy”), no last12Hours. */
export function defaultOrdersFilters(now: Date = new Date(), timezone?: string): OrdersListFilters {
  const today = toLocalIsoDate(now, timezone);
  return {
    dateMode: 'today',
    dateFrom: today,
    dateTo: today,
    limit: 150,
  };
}

/**
 * Query string para GET /orders.
 * No mezclar `last12Hours` con `dateFrom`/`dateTo`.
 */
export function buildOrdersQueryString(
  brand: Brand,
  filters: OrdersListFilters = defaultOrdersFilters(),
): string {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 150));

  if (brand.subdomain) {
    params.set('subdomains', brand.subdomain);
  }

  if (filters.dateMode === 'last12Hours') {
    params.set('last12Hours', 'true');
  } else if (filters.dateMode !== 'all') {
    const from = filters.dateFrom ?? toLocalIsoDate(new Date(), brand.timezone);
    const to = filters.dateMode === 'today' || filters.dateMode === 'day' ? from : filters.dateTo ?? from;
    params.set('dateFrom', from <= to ? from : to);
    params.set('dateTo', from <= to ? to : from);
  }

  if (filters.source) params.set('sources', String(filters.source));

  const search = filters.search?.trim();
  if (search) {
    params.set('search', search);
  }

  if (filters.branchId && filters.branchId !== 'todas') {
    params.set('branchId', filters.branchId);
  }

  return params.toString();
}
