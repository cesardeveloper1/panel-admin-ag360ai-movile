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

export function riderScreen(orders: Order[], selectedId: string | null):
  | { kind: 'trip'; order: Order }
  | { kind: 'list'; orders: Order[] } {
  const onRoute = orders.find((order) => order.status === 'on_the_way');
  if (onRoute) return { kind: 'trip', order: onRoute };
  const selected = orders.find((order) => order.id === selectedId && order.status === 'in_kitchen');
  if (selected) return { kind: 'trip', order: selected };
  return { kind: 'list', orders: orders.filter((order) => order.status === 'in_kitchen') };
}

export function navigationHref(order: Pick<Order, 'latitude' | 'longitude' | 'address'>): string | null {
  if (typeof order.latitude === 'number' && typeof order.longitude === 'number') {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
  }
  const address = order.address?.trim();
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
