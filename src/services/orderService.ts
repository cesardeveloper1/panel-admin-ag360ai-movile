import { api } from './api';
import { parseListPage, type ListPage } from './listPage';
import type { Brand, Order, OrderStatus } from '../types';
import { unwrapApiPayload } from '../utils/apiPayload';
import { mapOrdersFromApi, type ApiOrderListItem } from './mappers/orderMapper';
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
 * si `id` no es ObjectId, resuelve vía detalle de orquestación por orderNumber.
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
    `/order-orchestration/${encodeURIComponent(orderNumber.trim())}/detail`,
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

  async getOrdersPage(brand: Brand, filters: OrdersListFilters): Promise<ListPage<Order>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 150;
    const response = await api.get(`/orders?${buildOrdersQueryString(brand, filters)}`);
    const result = parseListPage<ApiOrderListItem>(response, page, limit);
    const data = mapOrdersFromApi(result.data, brand.id);
    if (data.length !== result.data.length) throw new Error('Invalid order identity');
    return { ...result, data };
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

    await api.put(endpoint, body);
    return null;
  },
};
