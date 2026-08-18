import { createContext } from 'react';
import type { ContactInfo } from '../types/contact';

export interface ChatNewMessagePayload {
  _id?: string;
  id?: string;
  subDomain?: string;
  phoneNumber?: string;
  clientBsuid?: string;
  content?: string;
  sender?: string;
  createdAt?: string;
  clientName?: string;
}

export interface ContactInfoUpdatedPayload {
  type?: string;
  contactInfo?: ContactInfo;
  subDomain?: string;
  clientPhone?: string;
  clientBsuid?: string;
}

export interface ChatSocketContextValue {
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
