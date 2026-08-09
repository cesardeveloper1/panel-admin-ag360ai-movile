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
});
