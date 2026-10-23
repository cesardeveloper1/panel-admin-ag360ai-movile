import { describe, expect, it } from 'vitest';
import { encodeHistoryCursor, parseConversationHistory } from './chatService';

describe('parseConversationHistory', () => {
  it('parsea { success, data }', () => {
    const msgs = parseConversationHistory(
      {
        success: true,
        data: [
          {
            _id: 'm1',
            content: 'Hola',
            sender: 'user',
            createdAt: '2026-01-01T10:00:00Z',
          },
          {
            _id: 'm2',
            content: 'Buenas',
            sender: 'ai',
            createdAt: '2026-01-01T10:01:00Z',
          },
        ],
      },
      'chat-1',
    );
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('customer');
    expect(msgs[1].role).toBe('bot');
  });

  it('parsea envoltorio Nest data.data', () => {
    const msgs = parseConversationHistory(
      {
        data: {
          data: [{ _id: 'x', content: 'ok', sender: 'device', createdAt: '2026-01-01T00:00:00Z' }],
        },
      },
      'c',
    );
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('agent');
  });
});

describe('encodeHistoryCursor', () => {
  it('codifica createdAt e id en base64url', () => {
    const cursor = encodeHistoryCursor('2026-01-01T10:00:00.000Z', 'abc123');
    expect(cursor).toBeTruthy();
    const json = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(cursor!.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)),
      ),
    );
    expect(json).toEqual({ createdAt: '2026-01-01T10:00:00.000Z', id: 'abc123' });
  });
});
