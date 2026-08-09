/** Contacto / AgentState — subset del ContactInfoDto del panel Operaciones. */

export type FunnelStage = 'INICIAL' | 'PIDIENDO' | 'CON_PEDIDO' | 'HUMANO';

export interface ContactInfo {
  _id: string;
  subDomain: string;
  clientPhone?: string;
  clientBsuid?: string;
  clientUsername?: string;
  clientName?: string | null;
  waProfileName?: string | null;
  customerRecordName?: string | null;
  localId?: string | null;
  threadId?: string | null;
  currentAgent: string;
  sessionData?: Record<string, unknown>;
  isActive: boolean;
  lastActivity: string;
  clientType: string;
  conversationState: string;
  lastMessageAt?: string | null;
  lastMessageSender?: 'user' | 'ai' | 'device' | null;
  lastMessageContent?: string | null;
  unreadMessages: number;
  lastOrderNumber?: string | null;
}

export interface ContactListMetadata {
  totalAgentStates: number;
  activeAgentStates: number;
  inactiveAgentStates: number;
  conversationStateCounts: Record<string, number>;
  pagination?: {
    currentPage: number;
    limit: number;
    totalPages: number;
    totalItems?: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  timestamp?: string;
}

export interface ContactListResult {
  data: ContactInfo[];
  meta: ContactListMetadata;
}

export interface ListContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  subDomain: string;
  branchId?: string;
  conversationState?: string;
  currentAgent?: string;
  clientType?: string;
}
