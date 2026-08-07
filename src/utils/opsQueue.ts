import { getKanbanSubState } from '../services/apiMock';
import type { Order } from '../types';

/** Lower = higher urgency. Display labels stay on ops.subStates.* */
export function urgencyRank(order: Order): number {
  const sub = getKanbanSubState(order);
  if (order.needsHuman || sub === 'human') return 0;
  if (sub === 'ordering') return 1;
  if (sub === 'starting') return 2;
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
