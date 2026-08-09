import type { ContactInfo, FunnelStage } from '../types/contact';

/** Misma semántica que panel `CONVERSATION_STATE` / `getKanbanPipelineStage`. */
export const CONVERSATION_STATE = {
  STARTING: 'starting',
  SEARCHING: 'searching',
  ORDER_PLACED: 'order_placed',
  ORDER_SCHEDULED: 'order_scheduled',
} as const;

type PipelineStage = 'INICIAL' | 'PIDIENDO' | 'CON_PEDIDO';

function getPipelineStage(contact: Pick<ContactInfo, 'sessionData'>): PipelineStage {
  const conversationState = (contact.sessionData as Record<string, unknown> | undefined)
    ?.conversationState as string | undefined;

  if (
    conversationState === CONVERSATION_STATE.ORDER_PLACED ||
    conversationState === CONVERSATION_STATE.ORDER_SCHEDULED
  ) {
    return 'CON_PEDIDO';
  }
  if (conversationState === CONVERSATION_STATE.SEARCHING) return 'PIDIENDO';
  if (conversationState === CONVERSATION_STATE.STARTING) return 'INICIAL';
  return 'INICIAL';
}

/**
 * Columna del embudo — replica `groupedContacts` de useOperacionesData:
 * inactivo sin pedido → HUMANO; si no, pipeline por conversationState.
 */
export function getFunnelStage(contact: ContactInfo): FunnelStage {
  const conversationState = (contact.sessionData as Record<string, unknown> | undefined)
    ?.conversationState as string | undefined;
  const isOrderPlaced =
    conversationState === CONVERSATION_STATE.ORDER_PLACED ||
    conversationState === CONVERSATION_STATE.ORDER_SCHEDULED;

  if (!contact.isActive && !isOrderPlaced) {
    return 'HUMANO';
  }
  return getPipelineStage(contact);
}

export function groupContactsByFunnel(
  contacts: ContactInfo[],
): Record<FunnelStage, ContactInfo[]> {
  const groups: Record<FunnelStage, ContactInfo[]> = {
    INICIAL: [],
    PIDIENDO: [],
    CON_PEDIDO: [],
    HUMANO: [],
  };
  for (const contact of contacts) {
    groups[getFunnelStage(contact)].push(contact);
  }
  return groups;
}

export function resolveContactDisplayName(contact: ContactInfo): string {
  return (
    contact.customerRecordName?.trim() ||
    contact.clientName?.trim() ||
    contact.waProfileName?.trim() ||
    contact.clientUsername?.trim() ||
    contact.clientPhone?.trim() ||
    '—'
  );
}
