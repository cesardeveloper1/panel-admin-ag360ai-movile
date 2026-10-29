import type { Order } from '../../types';

export function unassignedDispatchOrders(orders: Order[]): Order[] {
  return orders.filter((order) =>
    !order.riderId &&
    order.status !== 'delivered' &&
    order.status !== 'cancelled' &&
    order.status !== 'on_the_way',
  );
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
