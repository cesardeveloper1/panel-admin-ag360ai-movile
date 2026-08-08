import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';
import type { Brand, DashboardReport } from '../types';
import {
  mapDashboardFromApi,
  type ApiDashboardData,
} from './mappers/dashboardMapper';

export interface GetDashboardParams {
  brand: Brand;
  dateFrom: string;
  dateTo: string;
  period: 'today' | 'range';
}

/**
 * GET /dashboard/orderfood — mismo contrato que panel web Dashboard de Ventas.
 * `restaurant` = subdomain de la marca (no "all" en móvil).
 */
export const dashboardService = {
  async getDashboard(params: GetDashboardParams): Promise<DashboardReport> {
    const subdomain = params.brand.subdomain?.trim();
    if (!subdomain) {
      throw new Error('La marca no tiene subdomain para reportes');
    }

    const query = new URLSearchParams({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      restaurant: subdomain,
      channel: 'all',
    });

    const [dashboardRaw, conversationsTotal] = await Promise.all([
      api.get(`/dashboard/orderfood?${query.toString()}`),
      fetchConversationsCount(params.brand.id, params.dateFrom, params.dateTo),
    ]);

    const data = unwrapApiPayload<ApiDashboardData>(dashboardRaw);
    return mapDashboardFromApi(data, {
      period: params.period,
      conversationsTotal,
    });
  },
};

async function fetchConversationsCount(
  brandId: string,
  dateFrom: string,
  dateTo: string,
): Promise<number | undefined> {
  try {
    const query = new URLSearchParams();
    if (dateFrom === dateTo) {
      query.set('date', dateFrom);
    } else {
      query.set('dateFrom', dateFrom);
      query.set('dateTo', dateTo);
    }
    const raw = await api.get(
      `/brand/${brandId}/conversations/count?${query.toString()}`,
    );
    const payload = unwrapApiPayload<{ totalConversations?: number }>(raw);
    const n = payload?.totalConversations;
    return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}
