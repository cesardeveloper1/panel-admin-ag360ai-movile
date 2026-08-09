import type {
  ContactInfo,
  ContactListMetadata,
  ContactListResult,
  ListContactsParams,
} from '../types/contact';
import { api } from './api';

const EMPTY_META: ContactListMetadata = {
  totalAgentStates: 0,
  activeAgentStates: 0,
  inactiveAgentStates: 0,
  conversationStateCounts: {},
};

function asContactArray(value: unknown): ContactInfo[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ContactInfo =>
      typeof item === 'object' && item !== null && typeof (item as ContactInfo)._id === 'string',
  );
}

/**
 * Parsea la respuesta de GET /contact/list (misma forma anidada que el panel).
 */
export function parseContactListResponse(raw: unknown): ContactListResult {
  if (!raw || typeof raw !== 'object') {
    return { data: [], meta: EMPTY_META };
  }

  const root = raw as Record<string, unknown>;
  const outer = root.data;

  if (outer && typeof outer === 'object' && !Array.isArray(outer)) {
    const nested = outer as Record<string, unknown>;
    if (Array.isArray(nested.data) && nested.meta && typeof nested.meta === 'object') {
      return {
        data: asContactArray(nested.data),
        meta: { ...EMPTY_META, ...(nested.meta as ContactListMetadata) },
      };
    }
    if (Array.isArray(nested.data)) {
      return { data: asContactArray(nested.data), meta: EMPTY_META };
    }
  }

  if (Array.isArray(outer)) {
    return { data: asContactArray(outer), meta: EMPTY_META };
  }

  if (Array.isArray(root.data)) {
    return { data: asContactArray(root.data), meta: EMPTY_META };
  }

  return { data: [], meta: EMPTY_META };
}

export const contactService = {
  async list(params: ListContactsParams): Promise<ContactListResult> {
    const subDomain = params.subDomain.trim();
    if (!subDomain) {
      return { data: [], meta: EMPTY_META };
    }

    const qs = new URLSearchParams();
    qs.set('subDomain', subDomain);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 150));

    if (params.search?.trim()) qs.set('search', params.search.trim());
    if (params.branchId?.trim()) qs.set('branchId', params.branchId.trim());
    if (params.conversationState) qs.set('conversationState', params.conversationState);
    if (params.currentAgent) qs.set('currentAgent', params.currentAgent);
    if (params.clientType) qs.set('clientType', params.clientType);

    const raw = await api.get(`/contact/list?${qs.toString()}`);
    return parseContactListResponse(raw);
  },
};
