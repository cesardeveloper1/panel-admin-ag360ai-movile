import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';
import type { ContactInfo, FunnelStage } from '../types/contact';
import { config } from '../config/env';
import { apiMock } from './apiMock';
import { groupContactsByFunnel } from '../utils/funnelStage';

export const OPERATION_STAGES: Record<FunnelStage, string> = {
  INICIAL: 'iniciando', PIDIENDO: 'pidiendo', HUMANO: 'humano', CON_PEDIDO: 'con_pedido',
};
export interface ConversationPage {
  items: ContactInfo[];
  total: number | null;
  nextCursor: string | null;
  hasMore: boolean;
}
export interface ConversationFilters {
  subDomain: string;
  branchId?: string;
  channel?: string;
  search?: string;
}
export async function readConversationPage(filters: ConversationFilters, stage: FunnelStage, cursor?: string, signal?: AbortSignal): Promise<ConversationPage> {
  if (config.useApiMock) {
    const items = groupContactsByFunnel((await apiMock.getContacts(filters.subDomain)).data as ContactInfo[])[stage]
      .filter(item => !filters.channel || item.channel === filters.channel)
      .filter(item => !filters.search || `${item.clientName} ${item.clientPhone} ${item.lastMessageContent}`.toLowerCase().includes(filters.search.toLowerCase()));
    return {items, total: items.length, nextCursor: null, hasMore: false};
  }
  const query = new URLSearchParams({subDomain: filters.subDomain, stage: OPERATION_STAGES[stage], funnelWindow: '12h', clientGroup: 'clients', limit: '30', includeTotal: cursor ? 'false' : 'true'});
  for (const key of ['branchId', 'channel', 'search'] as const) if (filters[key]) query.set(key, filters[key]);
  if (filters.branchId) query.set('branchScope', 'branch');
  if (cursor) query.set('cursor', cursor);
  const page = unwrapApiPayload<ConversationPage>(await api.get(`/operations/conversations?${query}`, {signal}));
  if (!page || !Array.isArray(page.items) || page.items.some(item => typeof item?._id !== 'string') || typeof page.hasMore !== 'boolean' || (page.hasMore && !page.nextCursor)) throw new Error('Invalid operations conversation page');
  return {...page, total: typeof page.total === 'number' ? page.total : null};
}
