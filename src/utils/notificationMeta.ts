import {
  alertCircleOutline,
  warningOutline,
  cardOutline,
  chatbubbleEllipsesOutline,
  flameOutline,
  receiptOutline,
} from 'ionicons/icons';
import type { NotificationKind } from '../types';

export interface NotificationMeta {
  icon: string;
  accent: string;
  surface: string;
  border: string;
  badgeBg: string;
  badgeColor: string;
  labelKey: string;
}

export const NOTIFICATION_META: Record<NotificationKind, NotificationMeta> = {
  order: {
    icon: receiptOutline,
    accent: '#8746ff',
    surface: 'rgba(135, 70, 255, 0.08)',
    border: 'rgba(135, 70, 255, 0.28)',
    badgeBg: 'rgba(135, 70, 255, 0.14)',
    badgeColor: '#5b21b6',
    labelKey: 'notifications.types.order',
  },
  kitchen: {
    icon: flameOutline,
    accent: '#c2410c',
    surface: 'rgba(194, 65, 12, 0.08)',
    border: 'rgba(194, 65, 12, 0.28)',
    badgeBg: 'rgba(194, 65, 12, 0.14)',
    badgeColor: '#9a3412',
    labelKey: 'notifications.types.kitchen',
  },
  payment: {
    icon: cardOutline,
    accent: '#059669',
    surface: 'rgba(5, 150, 105, 0.08)',
    border: 'rgba(5, 150, 105, 0.28)',
    badgeBg: 'rgba(5, 150, 105, 0.14)',
    badgeColor: '#047857',
    labelKey: 'notifications.types.payment',
  },
  whatsapp: {
    icon: chatbubbleEllipsesOutline,
    accent: '#25d366',
    surface: 'rgba(37, 211, 102, 0.08)',
    border: 'rgba(37, 211, 102, 0.28)',
    badgeBg: 'rgba(37, 211, 102, 0.14)',
    badgeColor: '#15803d',
    labelKey: 'notifications.types.whatsapp',
  },
  complaint: {
    icon: warningOutline,
    accent: '#dc2626',
    surface: 'rgba(220, 38, 38, 0.07)',
    border: 'rgba(220, 38, 38, 0.25)',
    badgeBg: 'rgba(220, 38, 38, 0.12)',
    badgeColor: '#b91c1c',
    labelKey: 'notifications.types.complaint',
  },
  system: {
    icon: alertCircleOutline,
    accent: '#2563eb',
    surface: 'rgba(37, 99, 235, 0.08)',
    border: 'rgba(37, 99, 235, 0.24)',
    badgeBg: 'rgba(37, 99, 235, 0.12)',
    badgeColor: '#1d4ed8',
    labelKey: 'notifications.types.system',
  },
};

export function getNotificationMeta(kind: NotificationKind): NotificationMeta {
  return NOTIFICATION_META[kind];
}
