import type { KanbanGroup, KanbanSubState, Order, OrderStatus } from '../types';

/** Agrupa los estados de pedidos igual que el kanban de Operaciones del panel. */
export function getKanbanGroup(status: OrderStatus): KanbanGroup | null {
  if (status === 'delivered') return 'delivered';
  if (status === 'in_kitchen' || status === 'ready' || status === 'on_the_way') {
    return 'processing';
  }
  if (status === 'accepted' || status === 'pre_order') return 'new';
  return null;
}

export function getKanbanSubState(order: Order): KanbanSubState {
  if (order.status === 'delivered') return 'delivered';
  if (order.status === 'in_kitchen') return 'in_kitchen';
  if (order.status === 'ready') return 'ready';
  if (order.status === 'on_the_way') return 'on_the_way';
  if (order.status === 'pre_order') return 'pre_order';
  if (order.status === 'accepted') return 'accepted';
  return 'pre_order';
}

export function getKitchenAction(status: OrderStatus): OrderStatus | null {
  if (status === 'accepted') return 'in_kitchen';
  if (status === 'in_kitchen') return 'ready';
  if (status === 'ready') return 'on_the_way';
  return null;
}
