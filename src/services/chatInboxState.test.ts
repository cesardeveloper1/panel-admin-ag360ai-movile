import { describe, expect, it } from 'vitest';
import {
  applyInboxMessageUpdate,
  upsertInboxConversation,
} from './chatInboxState';
import type { ChatConversation } from '../types';

const first: ChatConversation = {
  id: 'first',
  phone: '+51999999999',
  nameKey: 'customers.unknown',
  lastMessageKey: 'chats.noPreview',
  lastMessage: 'Anterior',
  time: '09:00',
  unread: 0,
  botActive: true,
  brandId: 'brand',
};

const second: ChatConversation = {
  ...first,
  id: 'second',
  phone: '+51888888888',
};

describe('chatInboxState', () => {
  it('actualiza y mueve al inicio únicamente la conversación que recibió el mensaje', () => {
    const updated = applyInboxMessageUpdate(
      [first, second],
      { phoneNumber: second.phone, content: 'Mensaje nuevo', createdAt: '2026-08-10T15:30:00Z' },
      true,
    );

    expect(updated?.map((chat) => chat.id)).toEqual(['second', 'first']);
    expect(updated?.[0]).toMatchObject({ lastMessage: 'Mensaje nuevo', unread: 1 });
  });

  it('fusiona actualizaciones de contacto sin duplicar conversaciones', () => {
    const updated = upsertInboxConversation([first], { ...first, unread: 3, lastMessage: 'Actualizado' });

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ unread: 3, lastMessage: 'Actualizado' });
  });
});
