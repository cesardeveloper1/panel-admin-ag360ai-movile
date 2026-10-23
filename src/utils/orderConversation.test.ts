import { describe, expect, it } from 'vitest';
import { orderConversationPath } from './orderConversation';

describe('order conversation links', () => {
  it('never substitutes a phone when the persisted identity is missing', () => {
    expect(orderConversationPath({})).toBeNull();
    expect(orderConversationPath({ agentStateId: '  ' })).toBeNull();
  });
  it('uses the distinct persisted identity rather than phone or customer matching', () => {
    expect(orderConversationPath({ agentStateId: 'account-a/state' })).toBe('/app/chats?agentStateId=account-a%2Fstate');
    expect(orderConversationPath({ agentStateId: 'account-b/state' })).toBe('/app/chats?agentStateId=account-b%2Fstate');
  });
});
