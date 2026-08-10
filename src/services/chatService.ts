import type { ChatMessage } from '../types';
import { unwrapApiPayload } from '../utils/apiPayload';
import { api } from './api';
import {
  mapApiMessageToChatMessage,
  sortMessagesChronologically,
  type ApiChatMessage,
} from './mappers/chatMapper';

export interface SendChatAttachment {
  type: 'image' | 'document' | 'audio';
  url: string;
  caption?: string;
  filename?: string;
}

export interface SendChatMessageInput {
  subDomain: string;
  clientPhone?: string;
  clientBsuid?: string;
  message?: string;
  /** Default Meta; baileys solo superadmin. */
  provider?: string;
  localId?: string;
  branchId?: string;
  attachments?: SendChatAttachment[];
}

function asMessageArray(value: unknown): ApiChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ApiChatMessage =>
      typeof item === 'object' && item !== null,
  );
}

/** Parsea historial: { success, data } o envoltorio Nest { data: { data } }. */
export function parseConversationHistory(
  raw: unknown,
  chatId: string,
): ChatMessage[] {
  if (!raw || typeof raw !== 'object') return [];

  const root = raw as Record<string, unknown>;
  let list: unknown = root.data;

  if (list && typeof list === 'object' && !Array.isArray(list)) {
    const nested = list as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      list = nested.data;
    } else if (Array.isArray(nested.messages)) {
      list = nested.messages;
    }
  }

  if (!Array.isArray(list) && Array.isArray(root)) {
    list = root;
  }

  const mapped = asMessageArray(list)
    .map((msg) => mapApiMessageToChatMessage(msg, chatId))
    .filter((m): m is ChatMessage => m !== null);

  return sortMessagesChronologically(mapped);
}

export function parseConversationHistoryPage(raw: unknown, chatId: string): {
  messages: ChatMessage[];
  nextCursor?: string;
} {
  const messages = parseConversationHistory(raw, chatId);
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const metaSource = root.meta || (root.data as Record<string, unknown> | undefined)?.meta;
  const meta = metaSource && typeof metaSource === 'object' ? (metaSource as Record<string, unknown>) : {};
  return { messages, nextCursor: typeof meta.nextCursor === 'string' ? meta.nextCursor : undefined };
}

export const chatService = {
  async getHistoryPage(params: {
    chatId: string;
    phone?: string;
    subDomain?: string;
    agentStateId?: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ messages: ChatMessage[]; nextCursor?: string }> {
    const limit = Math.min(Math.max(params.limit ?? 40, 1), 200);
    const qs = new URLSearchParams({ paginated: 'true', limit: String(limit) });
    if (params.cursor) qs.set('cursor', params.cursor);
    if (params.agentStateId?.trim()) {
      const id = encodeURIComponent(params.agentStateId.trim());
      const raw = await api.get(`/chats/history/agent-state/${id}?${qs.toString()}`);
      return parseConversationHistoryPage(raw, params.chatId);
    }
    const phone = params.phone?.trim();
    const subDomain = params.subDomain?.trim();
    if (!phone || !subDomain) return { messages: [] };
    const raw = await api.get(
      `/chats/history/${encodeURIComponent(phone)}/${encodeURIComponent(subDomain)}?${qs.toString()}`,
    );
    return parseConversationHistoryPage(raw, params.chatId);
  },

  async getHistoryByAgentStateId(agentStateId: string): Promise<ChatMessage[]> {
    const id = agentStateId.trim();
    if (!id) return [];
    const raw = await api.get(`/chats/history/agent-state/${encodeURIComponent(id)}`);
    return parseConversationHistory(raw, id);
  },

  async getHistoryByPhone(phone: string, subDomain: string): Promise<ChatMessage[]> {
    const phoneNumber = phone.trim();
    const sub = subDomain.trim();
    if (!phoneNumber || !sub) return [];
    const raw = await api.get(
      `/chats/history/${encodeURIComponent(phoneNumber)}/${encodeURIComponent(sub)}`,
    );
    return parseConversationHistory(raw, phoneNumber);
  },

  async sendMessage(input: SendChatMessageInput): Promise<void> {
    const subDomain = input.subDomain.trim();
    if (!subDomain) throw new Error('Falta subDomain para enviar mensaje');
    if (!input.clientPhone?.trim() && !input.clientBsuid?.trim()) {
      throw new Error('Se requiere clientPhone o clientBsuid');
    }
    const hasText = Boolean(input.message?.trim());
    const hasAttachments = Boolean(input.attachments?.length);
    if (!hasText && !hasAttachments) {
      throw new Error('Mensaje vacío');
    }
    const body = {
      subDomain,
      clientPhone: input.clientPhone?.trim() || undefined,
      clientBsuid: input.clientBsuid?.trim() || undefined,
      message: input.message?.trim() || undefined,
      provider: input.provider || 'meta',
      localId: input.localId,
      branchId: input.branchId,
      attachments: input.attachments,
    };
    const raw = await api.post('/chats/send-message', body);
    // Algunas respuestas vienen como StdApiResponse; fallar si success=false
    if (raw && typeof raw === 'object') {
      const r = raw as Record<string, unknown>;
      if (r.success === false || r.type === 'ERROR') {
        throw {
          message: typeof r.message === 'string' ? r.message : 'Error al enviar mensaje',
          statusCode: r.statusCode ?? 500,
        };
      }
    }
    unwrapApiPayload(raw);
  },

  async markAsRead(params: {
    clientPhone: string;
    subDomain: string;
    messageIds?: string[];
  }): Promise<void> {
    const clientPhone = params.clientPhone.trim();
    const subDomain = params.subDomain.trim();
    if (!clientPhone || !subDomain) return;
    if (!params.messageIds?.length) return;

    await api.put('/contact/mark-as-read', {
      clientPhone,
      subDomain,
      messageIds: params.messageIds,
    });
  },
};
