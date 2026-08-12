import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';
import type {
  ComplaintNotificationView,
  ComplaintSeverity,
  NotificationItem,
  NotificationKind,
} from '../types';

type ComplaintAction = 'agent_deactivated' | 'none';

type ApiComplaintMetadata = {
  schemaVersion?: unknown;
  complaintId?: unknown;
  clientPhone?: unknown;
  complaintTypeLabel?: unknown;
  severity?: unknown;
  description?: unknown;
  actionTaken?: unknown;
};

export type ApiNotification = {
  _id?: string;
  id?: string;
  message?: string;
  category?: string;
  priority?: string;
  metadata?: unknown;
  isRead?: boolean;
  createdAt?: string;
};

function kindFromCategory(category: string | undefined): NotificationKind {
  switch (category) {
    case 'orders': return 'order';
    case 'payments': return 'payment';
    case 'chatbot': return 'whatsapp';
    case 'inventory': return 'kitchen';
    case 'complaint': return 'complaint';
    default: return 'system';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function complaintSeverity(value: unknown): ComplaintSeverity | undefined {
  return value === 'low' || value === 'medium' || value === 'high' ? value : undefined;
}

function complaintAction(value: unknown): ComplaintAction | undefined {
  return value === 'agent_deactivated' || value === 'none' ? value : undefined;
}

function modernComplaint(metadata: unknown): ComplaintNotificationView | undefined {
  if (!isRecord(metadata)) return undefined;
  const raw = metadata as ApiComplaintMetadata;
  if (raw.schemaVersion !== 1) return undefined;

  const description = optionalText(raw.description);
  const typeLabel = optionalText(raw.complaintTypeLabel);
  if (!description && !typeLabel) return undefined;

  return {
    schemaVersion: 1,
    complaintId: optionalText(raw.complaintId),
    clientPhone: optionalText(raw.clientPhone),
    typeLabel,
    severity: complaintSeverity(raw.severity),
    description,
    actionTaken: complaintAction(raw.actionTaken),
  };
}

/** Keeps historical notifications readable without leaking WhatsApp Markdown into UI. */
function legacyComplaintMessage(message: string | undefined): string | undefined {
  const cleaned = message
    ?.replace(/\*/g, '')
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, '')
    .replace(/^\s*RECLAMO DE CLIENTE\s*/iu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned || undefined;
}

function formatTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function mapNotificationFromApi(raw: ApiNotification): NotificationItem {
  const id = String(raw._id ?? raw.id ?? '').trim();
  const kind = kindFromCategory(raw.category);
  const complaint = kind === 'complaint' ? modernComplaint(raw.metadata) : undefined;

  if (kind === 'complaint') {
    return {
      id,
      kind,
      titleKey: 'notifications.complaint.title',
      body: complaint ? undefined : legacyComplaintMessage(raw.message),
      complaint,
      unread: raw.isRead !== true,
      time: formatTime(raw.createdAt),
    };
  }

  return {
    id,
    kind,
    title: raw.message?.trim() || 'Nueva alerta',
    unread: raw.isRead !== true,
    time: formatTime(raw.createdAt),
  };
}

export const notificationService = {
  async list(brandId: string): Promise<NotificationItem[]> {
    const response = await api.get(`/notifications/get-by-brand/${encodeURIComponent(brandId)}`);
    const data = unwrapApiPayload<ApiNotification[]>(response);
    return Array.isArray(data) ? data.map(mapNotificationFromApi).filter((item) => item.id) : [];
  },

  async markRead(id: string): Promise<void> {
    await api.put(`/notifications/mark-as-read/${encodeURIComponent(id)}`);
  },

  async markAllRead(brandId: string): Promise<void> {
    await api.put('/notifications/mark-as-read-all', { brandId });
  },
};
