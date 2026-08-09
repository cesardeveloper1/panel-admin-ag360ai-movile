import { describe, expect, it } from 'vitest';
import type { ContactInfo } from '../types/contact';
import { getFunnelStage, groupContactsByFunnel } from './funnelStage';

function contact(partial: Partial<ContactInfo> & Pick<ContactInfo, '_id'>): ContactInfo {
  return {
    subDomain: 'demo',
    currentAgent: 'artemis',
    isActive: true,
    lastActivity: new Date().toISOString(),
    clientType: 'client',
    conversationState: 'starting',
    unreadMessages: 0,
    sessionData: { conversationState: 'starting' },
    ...partial,
  };
}

describe('getFunnelStage', () => {
  it('mapea starting → INICIAL', () => {
    expect(
      getFunnelStage(contact({ _id: '1', sessionData: { conversationState: 'starting' } })),
    ).toBe('INICIAL');
  });

  it('mapea searching → PIDIENDO', () => {
    expect(
      getFunnelStage(contact({ _id: '2', sessionData: { conversationState: 'searching' } })),
    ).toBe('PIDIENDO');
  });

  it('mapea order_placed → CON_PEDIDO', () => {
    expect(
      getFunnelStage(contact({ _id: '3', sessionData: { conversationState: 'order_placed' } })),
    ).toBe('CON_PEDIDO');
  });

  it('inactivo sin pedido → HUMANO', () => {
    expect(
      getFunnelStage(
        contact({
          _id: '4',
          isActive: false,
          sessionData: { conversationState: 'starting' },
        }),
      ),
    ).toBe('HUMANO');
  });

  it('inactivo con order_placed sigue CON_PEDIDO', () => {
    expect(
      getFunnelStage(
        contact({
          _id: '5',
          isActive: false,
          sessionData: { conversationState: 'order_placed' },
        }),
      ),
    ).toBe('CON_PEDIDO');
  });
});

describe('groupContactsByFunnel', () => {
  it('agrupa por etapa', () => {
    const grouped = groupContactsByFunnel([
      contact({ _id: 'a', sessionData: { conversationState: 'starting' } }),
      contact({ _id: 'b', sessionData: { conversationState: 'searching' } }),
      contact({ _id: 'c', isActive: false, sessionData: { conversationState: 'starting' } }),
    ]);
    expect(grouped.INICIAL).toHaveLength(1);
    expect(grouped.PIDIENDO).toHaveLength(1);
    expect(grouped.HUMANO).toHaveLength(1);
    expect(grouped.CON_PEDIDO).toHaveLength(0);
  });
});
