import type { Brand } from '../types';

/**
 * Filtros de listado alineados a panel
 * `buildOrdersQueryParams` (OrdersQueryMapper).
 */
export type OrdersDateMode = 'today' | 'last12Hours' | 'range';

export interface OrdersListFilters {
  dateMode: OrdersDateMode;
  /** YYYY-MM-DD — requerido salvo last12Hours */
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  branchId?: string;
  limit?: number;
}

export function toLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Default Operaciones: hoy calendario (pill “Hoy”), no last12Hours. */
export function defaultOrdersFilters(now: Date = new Date()): OrdersListFilters {
  const today = toLocalIsoDate(now);
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
  params.set('page', '1');
  params.set('limit', String(filters.limit ?? 150));

  if (brand.subdomain) {
    params.set('subdomains', brand.subdomain);
  }

  if (filters.dateMode === 'last12Hours') {
    params.set('last12Hours', 'true');
  } else {
    const from = filters.dateFrom ?? toLocalIsoDate();
    const to = filters.dateTo ?? from;
    params.set('dateFrom', from <= to ? from : to);
    params.set('dateTo', from <= to ? to : from);
  }

  const search = filters.search?.trim();
  if (search) {
    params.set('search', search);
  }

  if (filters.branchId && filters.branchId !== 'todas') {
    params.set('branchId', filters.branchId);
  }

  return params.toString();
}
