import { describe, expect, it } from 'vitest';
import { mapNotificationFromApi } from './notificationService';

describe('mapNotificationFromApi', () => {
  it('maps complaint metadata v1 into structured mobile fields', () => {
    const item = mapNotificationFromApi({
      _id: 'notification-1',
      category: 'complaint',
      message: 'Reclamo de 51999999999: Calidad de comida',
      metadata: {
        schemaVersion: 1,
        complaintId: 'complaint-1',
        clientPhone: '51999999999',
        complaintTypeLabel: 'Calidad de comida',
        severity: 'high',
        description: 'La hamburguesa llegó fría.',
        actionTaken: 'agent_deactivated',
      },
      isRead: false,
    });

    expect(item.kind).toBe('complaint');
    expect(item.titleKey).toBe('notifications.complaint.title');
    expect(item.body).toBeUndefined();
    expect(item.complaint).toEqual({
      schemaVersion: 1,
      complaintId: 'complaint-1',
      clientPhone: '51999999999',
      typeLabel: 'Calidad de comida',
      severity: 'high',
      description: 'La hamburguesa llegó fría.',
      actionTaken: 'agent_deactivated',
    });
  });

  it('keeps legacy complaints readable without WhatsApp decoration', () => {
    const item = mapNotificationFromApi({
      id: 'notification-legacy',
      category: 'complaint',
      message: '🚨 *RECLAMO DE CLIENTE* 🚨\n*Cliente:* 51999999999 📋\n*Descripción:* Llegó frío. ⚡',
    });

    expect(item.kind).toBe('complaint');
    expect(item.complaint).toBeUndefined();
    expect(item.body).toBe('Cliente: 51999999999\nDescripción: Llegó frío.');
    expect(item.body).not.toMatch(/[\p{Extended_Pictographic}*]/u);
  });

  it('falls back safely when complaint metadata has an unknown version', () => {
    const item = mapNotificationFromApi({
      id: 'notification-future',
      category: 'complaint',
      message: 'Reclamo pendiente',
      metadata: { schemaVersion: 2, description: 'Formato futuro' },
    });

    expect(item.complaint).toBeUndefined();
    expect(item.body).toBe('Reclamo pendiente');
  });
});
