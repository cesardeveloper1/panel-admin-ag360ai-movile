import { api } from './api';
import type { Brand, Order, OrderStatus } from '../types';
import { unwrapApiPayload } from '../utils/apiPayload';
import { mapOrdersFromApi, type ApiOrderListItem } from './mappers/orderMapper';
import { mapStatusToApi } from './mappers/orderStatusMapper';
import {
  buildOrdersQueryString,
  defaultOrdersFilters,
  type OrdersListFilters,
} from './ordersQuery';

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
   * GET /orders — mismos filtros que panel Operaciones (Órdenes).
   * @see ordersQuery.ts / panel buildOrdersQueryParams
   */
  async getOrders(
    brand: Brand,
    filters: OrdersListFilters = defaultOrdersFilters(),
  ): Promise<Order[]> {
    const query = buildOrdersQueryString(brand, filters);
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
    return null;
  },
};
