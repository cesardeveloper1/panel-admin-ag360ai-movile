import { createContext } from 'react';
import type { ContactInfo } from '../types/contact';

export interface ChatNewMessagePayload {
  _id?: string;
  id?: string;
  subDomain?: string;
  agentStateId?: string;
  phoneNumber?: string;
  clientBsuid?: string;
  content?: string;
  sender?: string;
  isNewConversation?: boolean;
  createdAt?: string;
  clientName?: string;
  metadata?: {
    messageType?: string;
    attachments?: Array<{ type?: string; url?: string; name?: string }>;
    interactive?: { kind?: string; buttonTitle?: string };
    additional?: {
      kind?: string;
      incoming?: { storyMentionUrl?: string };
      contentNotice?: { state?: string };
    };
    referral?: { sourceType?: string; headline?: string; body?: string; sourceId?: string };
  };
}

export interface ContactInfoUpdatedPayload {
  type?: string;
  contactInfo?: ContactInfo;
  subDomain?: string;
  clientPhone?: string;
  clientBsuid?: string;
}

export interface ChatSocketContextValue {
  subscribeOperationsChanged: (listener: () => void) => () => void;
  subscribeNewMessage: (listener: (payload: ChatNewMessagePayload) => void) => () => void;
  subscribeContactUpdated: (listener: (payload: ContactInfoUpdatedPayload) => void) => () => void;
  joinHistoryRoom: (opts: {
    subDomain: string;
    phoneNumber?: string;
    agentStateId?: string;
  }) => void;
  clearHistoryRoom: () => void;
}

export const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);
