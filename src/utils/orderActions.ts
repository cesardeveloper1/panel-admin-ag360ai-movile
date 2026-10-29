import type { Order, OrderStatus, UserRole } from '../types';

export function normalizeUserRole(role: string): UserRole {
  const value = String(role ?? '').trim().toLowerCase();
  return ['owner', 'superadmin', 'manager', 'worker', 'motorized', 'rider'].includes(value) ? value as UserRole : 'unknown';
}

/** Projection of the existing panel permission contract; resource authorization remains server-side. */
export function authenticatedOrderCapability(user: {
  role: string;
  permissions?: { modules?: Record<string, { enabled?: boolean; actions?: string[] } | null> };
}): boolean {
  const role = normalizeUserRole(user.role);
  if (role === 'owner' || role === 'superadmin') return true;
  if (role !== 'manager' && role !== 'worker') return false;
  const module = user.permissions?.modules?.operaciones;
  return module?.enabled === true && (!module.actions?.length ||
    (module.actions.includes('view') && module.actions.includes('change_status')));
}

export interface OrderAction { next: OrderStatus; labelKey: string }
export type OrderActionResult = { ok: true; order: Order } | { ok: false; reason: 'denied' | 'failed' | 'conflict' | 'stale' };
export type OrderMutation = { pending: boolean; errorKey?: string };

export function nextOrderAction(order: Order, permitted: boolean): OrderAction | null {
  if (!permitted || order.statusVerified === false || order.deliveryType === 'unknown' || order.deliveryType === 'scheduled') return null;
  if (order.status === 'accepted') return { next: 'in_kitchen', labelKey: 'orderDetail.sendKitchen' };
  if (order.status === 'in_kitchen') return { next: 'ready', labelKey: 'orderDetail.markReady' };
  if (order.status === 'ready') return order.deliveryType === 'delivery'
    ? { next: 'on_the_way', labelKey: 'ops.actions.dispatch' }
    : { next: 'delivered', labelKey: 'orderDetail.markDelivered' };
  if (order.status === 'on_the_way' && order.deliveryType === 'delivery') return { next: 'delivered', labelKey: 'orderDetail.markDelivered' };
  return null;
}

/** Never overwrite a newer socket/read result with an older mutation read. */
export function mergeConfirmedOrder(current: Order, confirmed: Order): Order {
  const currentAt = Date.parse(current.updatedAt ?? '');
  const confirmedAt = Date.parse(confirmed.updatedAt ?? '');
  if (Number.isFinite(currentAt) && Number.isFinite(confirmedAt) && currentAt > confirmedAt) return current;
  return { ...current, ...confirmed };
}
