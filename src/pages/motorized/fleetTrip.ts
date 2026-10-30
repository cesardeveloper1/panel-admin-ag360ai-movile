import type { Order } from '../../types';

export interface DispatchBoard {
  unassigned: Order[];
  assigned: Order[];
  onTheWay: Order[];
  delivered: Order[];
}

export function dispatchBoard(orders: Order[]): DispatchBoard {
  const board: DispatchBoard = { unassigned: [], assigned: [], onTheWay: [], delivered: [] };
  for (const order of orders) {
    if (order.status === 'delivered') board.delivered.push(order);
    else if (order.status === 'on_the_way') board.onTheWay.push(order);
    else if (order.status === 'in_kitchen' && order.riderId) board.assigned.push(order);
    else if (order.status === 'in_kitchen') board.unassigned.push(order);
  }
  return board;
}

export function unassignedDispatchOrders(orders: Order[]): Order[] {
  return dispatchBoard(orders).unassigned;
}

export function riderPresenceKey(presence?: string | null): 'onTrip' | 'onShift' | 'offHours' | 'away' {
  if (presence === 'tracking') return 'onTrip';
  if (presence === 'online') return 'onShift';
  if (presence === 'off_hours') return 'offHours';
  return 'away';
}

export type RiderTripPhase = 'route' | 'kitchen' | 'waiting';

const WAITING_STATUSES = new Set<Order['status']>(['pre_order', 'accepted']);

/** Un solo viaje: en camino, si no hay en cocina, si no hay el programado o aceptado ya asignado. */
export function riderScreen(orders: Order[]):
  | { kind: 'trip'; phase: RiderTripPhase; order: Order }
  | { kind: 'empty' } {
  const onRoute = orders.find((order) => order.status === 'on_the_way');
  if (onRoute) return { kind: 'trip', phase: 'route', order: onRoute };
  const kitchen = orders.find((order) => order.status === 'in_kitchen');
  if (kitchen) return { kind: 'trip', phase: 'kitchen', order: kitchen };
  const waiting = orders.find((order) => WAITING_STATUSES.has(order.status) && Boolean(order.riderId));
  if (waiting) return { kind: 'trip', phase: 'waiting', order: waiting };
  return { kind: 'empty' };
}

export function navigationHref(order: Pick<Order, 'latitude' | 'longitude' | 'address'>): string | null {
  if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
  }
  const address = order.address?.trim();
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
