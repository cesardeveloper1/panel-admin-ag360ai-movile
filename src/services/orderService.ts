import { api } from './api';
import { parseListPage, type ListPage } from './listPage';
import type { Brand, Order, OrderStatus } from '../types';
import { unwrapApiPayload } from '../utils/apiPayload';
import { mapOrderDetail, mapOrderFromApi, mapOrdersFromApi, type ApiOrderDetail, type ApiOrderListItem } from './mappers/orderMapper';
import { mapStatusToApi } from './mappers/orderStatusMapper';
import {
  buildOrdersQueryString,
  defaultOrdersFilters,
  type OrdersListFilters,
} from './ordersQuery';

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export function isMongoObjectId(id: string): boolean {
  return MONGO_OBJECT_ID_PATTERN.test(id.trim());
}

/**
 * Igual que panel `ordersService.resolveCanonicalOrderId`:
 * si `id` no es ObjectId, resuelve con el GET autorizado de detalle por orderNumber.
 */
export async function resolveCanonicalOrderId(
  id: string,
  orderNumber?: string,
): Promise<string> {
  const trimmed = id.trim();
  if (isMongoObjectId(trimmed)) return trimmed;

  if (!orderNumber?.trim()) {
    throw new Error('No se pudo actualizar la orden: falta su identificador interno');
  }

  const raw = await api.get(
    `/orders/${encodeURIComponent(orderNumber.trim())}?orderNumber=${encodeURIComponent(orderNumber.trim())}`,
  );
  const payload = unwrapApiPayload<{ _id?: string; orderId?: string }>(raw);
  const canonicalId = String(payload?._id || payload?.orderId || '').trim();

  if (!isMongoObjectId(canonicalId)) {
    throw new Error('No se pudo resolver el identificador interno de la orden');
  }
  return canonicalId;
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
    return (await orderService.getOrdersPage(brand, filters)).data;
  },

  async getMotorizedOrdersPage(filters: OrdersListFilters): Promise<ListPage<Order>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 150;
    const response = await api.get(`/orders?${buildOrdersQueryString({ id: 'motorized', initials: 'M', nameKey: 'motorized', locations: 0, ordersToday: 0 }, filters)}`);
    const result = parseListPage<ApiOrderListItem>(response, page, limit);
    const data = result.data
      .map((row) => mapOrderFromApi(row, row.brandSubdomain || 'motorized'))
      .filter((order): order is Order => order !== null);
    if (data.length !== result.data.length) throw new Error('Invalid order identity');
    return { ...result, data };
  },

  async getOrdersPage(brand: Brand, filters: OrdersListFilters): Promise<ListPage<Order>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 150;
    const response = await api.get(`/orders?${buildOrdersQueryString(brand, filters)}`);
    const result = parseListPage<ApiOrderListItem>(response, page, limit);
    const data = mapOrdersFromApi(result.data, brand.id);
    if (data.length !== result.data.length) throw new Error('Invalid order identity');
    return { ...result, data };
  },

  async getOrderDetail(brand: Brand, order: Pick<Order, 'id' | 'orderNumber'>): Promise<Order> {
    const query = order.orderNumber ? `?orderNumber=${encodeURIComponent(order.orderNumber)}` : '';
    const raw = await api.get(`/orders/${encodeURIComponent(order.id)}${query}`);
    const payload = unwrapApiPayload<ApiOrderDetail>(raw);
    if (!payload || (brand.subdomain && payload.brandSubdomain !== brand.subdomain) ||
        (isMongoObjectId(order.id) && payload.orderId !== order.id) ||
        ('branchId' in order && order.branchId && payload.branchId !== order.branchId)) throw new Error('Order scope mismatch');
    const result = mapOrderDetail(payload, brand.id);
    if (!result) throw new Error('Invalid order detail');
    return result;
  },

  /**
   * PUT /orders/:id/status — mismo path primario que el panel Operaciones.
   * Body: `{ newStatus, reason? }` (labels API vía mapStatusToApi).
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    orderNumber?: string,
    reason?: string,
  ): Promise<Order | null> {
    const canonicalId = await resolveCanonicalOrderId(orderId, orderNumber);
    let endpoint = `/orders/${encodeURIComponent(canonicalId)}/status`;
    if (orderNumber) {
      endpoint += `?orderNumber=${encodeURIComponent(orderNumber)}`;
    }

    const body: { newStatus: string; reason?: string } = {
      newStatus: mapStatusToApi(status),
    };
    if (reason?.trim()) {
      body.reason = reason.trim();
    }

    unwrapApiPayload(await api.put(endpoint, body));
    return null;
  },
};
