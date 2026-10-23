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

  it('preserva metadatos de la segunda página', () => {
    const result = parseContactListResponse({ data: { data: [], meta: { pagination: { currentPage: 2, hasNextPage: false, totalPages: 2 } } } });
    expect(result.meta.pagination?.currentPage).toBe(2);
  });

  it('no confunde respuestas inválidas con listas vacías', () => {
    expect(() => parseContactListResponse(null)).toThrow();
    expect(() => parseContactListResponse({ success: false, data: [] })).toThrow();
    expect(parseContactListResponse({ data: [] }).data).toEqual([]);
  });
});
