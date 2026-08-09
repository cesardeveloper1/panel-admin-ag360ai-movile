import { describe, expect, it } from 'vitest';
import { parseContactListResponse } from './contactService';

describe('parseContactListResponse', () => {
  it('parsea estructura anidada data.data + meta', () => {
    const result = parseContactListResponse({
      data: {
        data: [
          {
            _id: 'c1',
            subDomain: 'demo',
            currentAgent: 'a',
            isActive: true,
            lastActivity: '2026-01-01',
            clientType: 'client',
            conversationState: 'starting',
            unreadMessages: 0,
          },
        ],
        meta: { totalAgentStates: 1, activeAgentStates: 1, inactiveAgentStates: 0 },
      },
    });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]._id).toBe('c1');
    expect(result.meta.totalAgentStates).toBe(1);
  });

  it('devuelve vacío si la forma no se reconoce', () => {
    const result = parseContactListResponse(null);
    expect(result.data).toEqual([]);
    expect(result.meta.totalAgentStates).toBe(0);
  });
});
