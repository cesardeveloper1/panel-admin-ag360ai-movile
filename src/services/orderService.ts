import { api } from './api';
import type { Brand, Order, OrderStatus } from '../types';
import { unwrapApiPayload } from '../utils/apiPayload';
import { mapOrdersFromApi, type ApiOrderListItem } from './mappers/orderMapper';
import { mapStatusToApi } from './mappers/orderStatusMapper';

/**
 * Query params alineados al panel Operaciones:
 * - subdomains: subdomain de la marca
 * - limit / page
 * - last12Hours: foco operativo del día
 *
 * @see panel-admin-ag360ai/src/pages/Orders/services/ordersService.ts
 */
function buildOrdersQuery(brand: Brand): string {
  const params = new URLSearchParams();
  params.set('page', '1');
  params.set('limit', '100');
  params.set('last12Hours', 'true');
  if (brand.subdomain) {
    params.set('subdomains', brand.subdomain);
  }
  return params.toString();
}

function extractOrderRows(response: unknown): ApiOrderListItem[] {
  const payload = unwrapApiPayload<unknown>(response);

  if (Array.isArray(payload)) {
    return payload as ApiOrderListItem[];
  }

  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data as ApiOrderListItem[];
    }
    if (Array.isArray(obj.orders)) {
      return obj.orders as ApiOrderListItem[];
    }
  }

  return [];
}

export const orderService = {
  /**
   * GET /orders?subdomains=…&last12Hours=true&limit=100
   */
  async getOrders(brand: Brand): Promise<Order[]> {
    const query = buildOrdersQuery(brand);
    const response = await api.get(`/orders?${query}`);
    const rows = extractOrderRows(response);
    return mapOrdersFromApi(rows, brand.id);
  },

  /**
   * PUT /order-orchestration/:id/status  body { newStatus }
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    orderNumber?: string,
  ): Promise<Order | null> {
    let endpoint = `/order-orchestration/${encodeURIComponent(orderId)}/status`;
    if (orderNumber) {
      endpoint += `?orderNumber=${encodeURIComponent(orderNumber)}`;
    }

    await api.put(endpoint, { newStatus: mapStatusToApi(status) });

    // El listado no siempre vuelve en la respuesta; el caller hace patch local o refetch.
    return null;
  },
};
