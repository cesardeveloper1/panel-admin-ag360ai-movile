import type { Order } from '../types';
import { CHATS_PATH } from '../navigation/navConfig';

/** A phone is not a conversation identity, especially with multiple accounts. */
export function orderConversationPath(order: Pick<Order, 'agentStateId'>): string | null {
  const id = order.agentStateId?.trim();
  return id ? `${CHATS_PATH}?agentStateId=${encodeURIComponent(id)}` : null;
}
