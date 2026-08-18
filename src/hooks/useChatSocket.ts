import { useContext } from 'react';
import {
  ChatSocketContext,
  type ChatSocketContextValue,
} from '../context/chatSocketContext';

const EMPTY_CHAT_SOCKET_CONTEXT: ChatSocketContextValue = {
  subscribeNewMessage: () => () => undefined,
  subscribeContactUpdated: () => () => undefined,
  joinHistoryRoom: () => undefined,
  clearHistoryRoom: () => undefined,
};

export function useChatSocket(): ChatSocketContextValue {
  return useContext(ChatSocketContext) ?? EMPTY_CHAT_SOCKET_CONTEXT;
}
