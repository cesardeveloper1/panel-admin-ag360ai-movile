import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';
import type { NotificationItem, NotificationKind } from '../types';

type ApiNotification = {
  _id?: string;
  id?: string;
  message?: string;
  category?: string;
  isRead?: boolean;
  createdAt?: string;
};

function kindFromCategory(category: string | undefined): NotificationKind {
  switch (category) {
    case 'orders': return 'order';
    case 'payments': return 'payment';
    case 'chatbot': return 'whatsapp';
    case 'inventory': return 'kitchen';
    default: return 'system';
  }
}

function formatTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function mapNotification(raw: ApiNotification): NotificationItem {
  const id = String(raw._id ?? raw.id ?? '').trim();
  return {
    id,
    kind: kindFromCategory(raw.category),
    title: raw.message?.trim() || 'Nueva alerta',
    unread: raw.isRead !== true,
    time: formatTime(raw.createdAt),
  };
}

export const notificationService = {
  async list(brandId: string): Promise<NotificationItem[]> {
    const response = await api.get(`/notifications/get-by-brand/${encodeURIComponent(brandId)}`);
    const data = unwrapApiPayload<ApiNotification[]>(response);
    return Array.isArray(data) ? data.map(mapNotification).filter((item) => item.id) : [];
  },

  async markRead(id: string): Promise<void> {
    await api.put(`/notifications/mark-as-read/${encodeURIComponent(id)}`);
  },

  async markAllRead(brandId: string): Promise<void> {
    await api.put('/notifications/mark-as-read-all', { brandId });
  },
};
