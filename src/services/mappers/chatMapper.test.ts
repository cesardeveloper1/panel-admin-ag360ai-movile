import { describe, expect, it } from 'vitest';
import type { ContactInfo } from '../../types/contact';
import {
  mapApiMessageToChatMessage,
  mapContactToConversation,
  mapSenderToRole,
  sortMessagesChronologically,
} from './chatMapper';

describe('chatMapper', () => {
  it('mapea senders a roles UI', () => {
    expect(mapSenderToRole('user')).toBe('customer');
    expect(mapSenderToRole('ai')).toBe('bot');
    expect(mapSenderToRole('device')).toBe('agent');
  });

  it('mapea contacto a conversación', () => {
    const contact: ContactInfo = {
      _id: 'as1',
      subDomain: 'demo',
      clientPhone: '+51999888777',
      clientName: 'Lucía',
      currentAgent: 'artemis',
      isActive: true,
      lastActivity: '2026-08-08T12:00:00.000Z',
      clientType: 'client',
      conversationState: 'starting',
      lastMessageContent: 'Hola',
      unreadMessages: 2,
    };
    const conv = mapContactToConversation(contact, 'brand-1');
    expect(conv.id).toBe('as1');
    expect(conv.displayName).toBe('Lucía');
    expect(conv.phone).toBe('+51999888777');
    expect(conv.unread).toBe(2);
    expect(conv.botActive).toBe(true);
    expect(conv.lastMessage).toBe('Hola');
    expect(conv.channel).toBeUndefined();
  });

  it('ordena mensajes cronológicamente', () => {
    const a = mapApiMessageToChatMessage(
      { _id: '1', content: 'a', sender: 'user', createdAt: '2026-01-02T00:00:00Z' },
      'c',
    )!;
    const b = mapApiMessageToChatMessage(
      { _id: '2', content: 'b', sender: 'device', createdAt: '2026-01-01T00:00:00Z' },
      'c',
    )!;
    expect(sortMessagesChronologically([a, b]).map((m) => m.id)).toEqual(['2', '1']);
  });

  it('conserva adjuntos, ubicación y respuesta de botón', () => {
    const message = mapApiMessageToChatMessage(
      {
        _id: '3',
        content: 'coordenadas -12.1, -77.0',
        sender: 'user',
        createdAt: '2026-01-03T00:00:00Z',
        metadata: {
          messageType: 'location',
          attachments: [{ type: 'document', url: 'https://cdn.example/menu.pdf', name: 'Carta' }],
          interactive: { kind: 'quick_reply', buttonTitle: 'Sí' },
        },
      },
      'c',
    )!;
    expect(message.messageType).toBe('location');
    expect(message.attachments?.[0].name).toBe('Carta');
    expect(message.interactiveReply).toEqual({ kind: 'quick_reply', title: 'Sí' });
  });

  it('conserva el separador de estado del bot', () => {
    const message = mapApiMessageToChatMessage(
      {
        _id: '4',
        content: 'Pedido acabado',
        sender: 'ai',
        createdAt: '2026-01-04T00:00:00Z',
        metadata: { messageType: 'bot_status', additional: { kind: 'order_completed' } },
      },
      'c',
    )!;
    expect(message.messageType).toBe('bot_status');
    expect(message.botStatusKind).toBe('order_completed');
    expect(message.mediaType).toBeUndefined();
  });
});
