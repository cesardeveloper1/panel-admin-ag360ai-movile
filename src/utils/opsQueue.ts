import { getKanbanSubState } from './orderKanban';
import type { Order } from '../types';

/** Lower = higher urgency. Display labels stay on ops.subStates.* */
export function urgencyRank(order: Order): number {
  const sub = getKanbanSubState(order);
  if (order.needsHuman) return 0;
  if (sub === 'accepted') return 1;
  if (sub === 'pre_order') return 2;
  if (sub === 'in_kitchen') return 3;
  if (sub === 'ready') return 4;
  if (sub === 'on_the_way') return 5;
  return 6;
}

/** Stable sort: urgency first, then id for ties. */
export function sortOpsQueue(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const byRank = urgencyRank(a) - urgencyRank(b);
    if (byRank !== 0) return byRank;
    return a.id.localeCompare(b.id);
  });
}
