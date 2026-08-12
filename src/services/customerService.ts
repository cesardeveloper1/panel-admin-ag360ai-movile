import { api } from './api';

export type CustomerType = 'New' | 'Regular' | 'VIP';

export interface CustomerAnalyticsParams {
  brandId: string;
  page?: number;
  limit?: number;
  search?: string;
  customerType?: CustomerType;
  sortBy?: 'orderCount' | 'totalAmount';
  sortDirection?: 'asc' | 'desc';
}

export interface CustomerAnalyticsCustomer {
  name: string;
  documentId: string;
  phone: string;
  lastOrderDate?: string | null;
  customerType: CustomerType;
  orderCount: number;
  totalAmount: number;
}

export interface CustomerAnalyticsData {
  customers: CustomerAnalyticsCustomer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary?: {
    totalOrders: number;
    totalAmount: number;
  };
}

type ApiEnvelope = {
  data?: CustomerAnalyticsData | { data?: CustomerAnalyticsData };
};

function buildQuery(params: CustomerAnalyticsParams): string {
  const query = new URLSearchParams({ brandId: params.brandId });
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.customerType) query.set('customerType', params.customerType);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortDirection) query.set('sortDirection', params.sortDirection);
  return query.toString();
}

function unwrapAnalyticsResponse(response: unknown): CustomerAnalyticsData {
  const envelope = response as ApiEnvelope;
  const firstData = envelope?.data;
  const data = firstData && typeof firstData === 'object' && 'data' in firstData
    ? firstData.data
    : firstData;

  if (!isCustomerAnalyticsData(data)) {
    throw new Error('La respuesta de clientes no tiene el formato esperado.');
  }

  return data;
}

function isCustomerAnalyticsData(value: unknown): value is CustomerAnalyticsData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CustomerAnalyticsData>;
  return Array.isArray(data.customers) && Boolean(data.meta);
}

/** Mismo endpoint y filtros que Gestión de Clientes del panel web. */
export const customerService = {
  async getCustomerAnalytics(params: CustomerAnalyticsParams): Promise<CustomerAnalyticsData> {
    const response = await api.get(`/customers/clients?${buildQuery(params)}`);
    return unwrapAnalyticsResponse(response);
  },
};
