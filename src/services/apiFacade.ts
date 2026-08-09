import { config } from '../config/env';
import type {
  Brand,
  ChatConversation,
  ChatMessage,
  DashboardReport,
  Order,
  OrderStatus,
  UserSession,
} from '../types';
import type { ContactListResult, ListContactsParams } from '../types/contact';
import { clearAuthTokens } from '../utils/authSession';
import { apiMock } from './apiMock';
import { authService } from './authService';
import { brandService } from './brandService';
import { chatService, type SendChatAttachment, type SendChatMessageInput } from './chatService';
import { contactService } from './contactService';
import { dashboardService } from './dashboardService';
import { mapContactToConversation } from './mappers/chatMapper';
import { orderService } from './orderService';
import { botService, type BotCtxState } from './botService';
import { quickMessageService, type QuickMessage } from './quickMessageService';
import {
  defaultOrdersFilters,
  type OrdersListFilters,
} from './ordersQuery';

export type { QuickMessage } from './quickMessageService';
export type { SendChatAttachment } from './chatService';

export type { OrdersListFilters } from './ordersQuery';
export type { BotCtxState } from './botService';

export interface GetDashboardFacadeParams {
  brand: Brand;
  period: 'today' | 'range';
  rangeDays?: number;
  rangeStart?: string;
  rangeEnd?: string;
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

/**
 * Fachada mock vs API real (auth, brands, orders, dashboard).
 */
export const apiFacade = {
  useMock: config.useApiMock,

  async login(email: string, password: string): Promise<UserSession | null> {
    if (config.useApiMock) {
      clearAuthTokens();
      return apiMock.login(email, password);
    }
    return authService.login(email, password);
  },

  logout(): void {
    if (!config.useApiMock) {
      clearAuthTokens();
    }
  },

  async getBrands(): Promise<Brand[]> {
    if (config.useApiMock) {
      return apiMock.getBrands();
    }
    return brandService.getAll();
  },

  async getOrders(
    brand: Brand,
    filters: OrdersListFilters = defaultOrdersFilters(),
  ): Promise<Order[]> {
    if (config.useApiMock) {
      return apiMock.getOrders(brand.id, filters);
    }
    return orderService.getOrders(brand, filters);
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    orderNumber?: string,
    reason?: string,
  ): Promise<Order | null> {
    if (config.useApiMock) {
      return apiMock.updateOrderStatus(orderId, status);
    }
    await orderService.updateOrderStatus(orderId, status, orderNumber, reason);
    return null;
  },

  async getDashboard(params: GetDashboardFacadeParams): Promise<DashboardReport> {
    const { brand, period, rangeDays = 7, rangeStart, rangeEnd } = params;

    if (config.useApiMock) {
      return apiMock.getDashboard(brand.id, period, rangeDays, rangeStart, rangeEnd);
    }

    const today = toLocalIsoDate(new Date());
    let dateFrom = today;
    let dateTo = today;
    let resolvedPeriod: 'today' | 'range' = period;

    if (period === 'today' && !rangeStart) {
      dateFrom = today;
      dateTo = today;
      resolvedPeriod = 'today';
    } else if (rangeStart) {
      dateFrom = rangeStart;
      dateTo = rangeEnd ?? rangeStart;
      resolvedPeriod = dateFrom === today && dateTo === today ? 'today' : 'range';
    } else {
      dateTo = today;
      dateFrom = shiftIsoDate(today, -(Math.max(1, rangeDays) - 1));
      resolvedPeriod = 'range';
    }

    return dashboardService.getDashboard({
      brand,
      dateFrom,
      dateTo,
      period: resolvedPeriod,
    });
  },

  async getBotState(subDomain: string): Promise<BotCtxState> {
    if (config.useApiMock) {
      return {
        subDomain,
        isOn: typeof localStorage !== 'undefined' && localStorage.getItem('ag360-agent-enabled') === 'true',
        lockedBySuperadmin: false,
      };
    }
    return botService.getState(subDomain);
  },

  async setBotEnabled(subDomain: string, isOn: boolean): Promise<BotCtxState> {
    if (config.useApiMock) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ag360-agent-enabled', String(isOn));
      }
      return { subDomain, isOn, lockedBySuperadmin: false };
    }
    return botService.setEnabled(subDomain, isOn);
  },

  async listContacts(params: ListContactsParams): Promise<ContactListResult> {
    if (config.useApiMock) {
      return apiMock.getContacts(params.subDomain, params.search);
    }
    return contactService.list(params);
  },

  async getChatConversations(
    brand: Brand,
    search?: string,
  ): Promise<ChatConversation[]> {
    if (config.useApiMock) {
      return apiMock.getChats(brand.id);
    }
    const subDomain = brand.subdomain?.trim();
    if (!subDomain) return [];
    const result = await contactService.list({
      subDomain,
      page: 1,
      limit: 150,
      search,
    });
    return result.data.map((c) => mapContactToConversation(c, brand.id));
  },

  async getChatMessages(params: {
    chatId: string;
    phone?: string;
    agentStateId?: string;
    subDomain?: string;
  }): Promise<ChatMessage[]> {
    if (config.useApiMock) {
      return apiMock.getChatMessages(params.chatId);
    }
    if (params.agentStateId?.trim()) {
      return chatService.getHistoryByAgentStateId(params.agentStateId);
    }
    if (params.phone?.trim() && params.subDomain?.trim()) {
      return chatService.getHistoryByPhone(params.phone, params.subDomain);
    }
    return [];
  },

  async listQuickMessages(brandId: string): Promise<QuickMessage[]> {
    if (config.useApiMock) {
      return [
        {
          _id: 'qm-1',
          brandId,
          shortcut: 'hola',
          text: '¡Hola! ¿En qué te puedo ayudar?',
          isActive: true,
        },
        {
          _id: 'qm-2',
          brandId,
          shortcut: 'menu',
          text: 'Te comparto nuestro menú del día 😊',
          isActive: true,
        },
      ];
    }
    const result = await quickMessageService.list(brandId, {
      page: 1,
      limit: 100,
      isActive: true,
    });
    return result.data;
  },

  async sendChatMessage(
    chat: ChatConversation,
    text: string,
    subDomain: string,
    attachments?: SendChatAttachment[],
  ): Promise<ChatMessage | null> {
    if (config.useApiMock) {
      const first = attachments?.[0];
      const preview =
        text.trim() ||
        (first?.type === 'image'
          ? '[Imagen]'
          : first?.type === 'audio'
            ? '[Audio]'
            : attachments?.length
              ? '[Archivo]'
              : '');
      return apiMock.sendChatMessage(chat.id, preview || '…');
    }
    const input: SendChatMessageInput = {
      subDomain,
      clientPhone: chat.phone || undefined,
      clientBsuid: chat.clientBsuid,
      message: text.trim() || undefined,
      provider: 'meta',
      attachments,
    };
    await chatService.sendMessage(input);
    const firstImage = attachments?.find((a) => a.type === 'image');
    const firstAudio = attachments?.find((a) => a.type === 'audio');
    const mediaUrl = firstImage?.url || firstAudio?.url;
    const mediaType = firstImage ? 'image' : firstAudio ? 'audio' : undefined;
    return {
      id: `local-${Date.now()}`,
      chatId: chat.id,
      role: 'agent',
      text:
        text.trim() ||
        (firstImage
          ? 'Imagen'
          : firstAudio
            ? 'Audio'
            : attachments?.[0]?.filename || 'Archivo'),
      time: new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: new Date().toISOString(),
      senderRaw: 'device',
      mediaUrl,
      mediaType,
    };
  },

  async markChatAsRead(params: {
    clientPhone: string;
    subDomain: string;
    messageIds?: string[];
  }): Promise<void> {
    if (config.useApiMock) return;
    await chatService.markAsRead(params);
  },
};
