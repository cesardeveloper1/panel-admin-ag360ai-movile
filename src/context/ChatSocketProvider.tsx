import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { config } from '../config/env';
import type { ContactInfo } from '../types/contact';
import { getAuthToken } from '../utils/authSession';
import { resolveSocketBaseUrl } from '../utils/resolveSocketBaseUrl';
import { useApp } from './AppContext';

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

type MessageListener = (payload: ChatNewMessagePayload) => void;
type ContactListener = (payload: ContactInfoUpdatedPayload) => void;
type HistoryRoomOptions = {
  subDomain: string;
  phoneNumber?: string;
  agentStateId?: string;
};

function emitHistoryRoom(socket: Socket, room: HistoryRoomOptions): void {
  socket.emit('joinChatHistoryRoom', room);
}

interface ChatSocketContextValue {
  subscribeNewMessage: (listener: MessageListener) => () => void;
  subscribeContactUpdated: (listener: ContactListener) => () => void;
  joinHistoryRoom: (opts: {
    subDomain: string;
    phoneNumber?: string;
    agentStateId?: string;
  }) => void;
  clearHistoryRoom: () => void;
}

const ChatSocketContext = createContext<ChatSocketContextValue | null>(null);

/**
 * Socket.IO `/chat`: join subdomain + agent-states; newMessage / contactInfoUpdated.
 */
export const ChatSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, brand } = useApp();
  const socketRef = useRef<Socket | null>(null);
  const historyRoomRef = useRef<HistoryRoomOptions | null>(null);
  const messageListeners = useRef(new Set<MessageListener>());
  const contactListeners = useRef(new Set<ContactListener>());

  useEffect(() => {
    if (config.useApiMock) return;
    if (!session || !brand?.subdomain?.trim()) return;

    const token = getAuthToken();
    if (!token) return;

    const subDomain = brand.subdomain.trim();
    const base = resolveSocketBaseUrl();
    const socket = io(`${base}/chat`, {
      auth: { token },
      query: {
        role: (session.role || 'owner').toUpperCase(),
        brandId: brand.id,
        brandSubdomain: subDomain,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('join', subDomain);
      socket.emit('joinAgentStatesRoom', { subDomain });
      const historyRoom = historyRoomRef.current;
      if (historyRoom?.subDomain === subDomain) {
        emitHistoryRoom(socket, historyRoom);
      }
      if (config.environment === 'development') {
        console.log('[mobile] /chat socket conectado', { subDomain });
      }
    };

    const onNewMessage = (payload: ChatNewMessagePayload) => {
      if (payload.subDomain && payload.subDomain !== subDomain) return;
      messageListeners.current.forEach((fn) => fn(payload));
    };

    const onContactUpdated = (payload: ContactInfoUpdatedPayload) => {
      const infoSub = payload.contactInfo?.subDomain || payload.subDomain;
      if (infoSub && infoSub !== subDomain) return;
      contactListeners.current.forEach((fn) => fn(payload));
    };

    socket.on('connect', onConnect);
    socket.on('newMessage', onNewMessage);
    socket.on('contactInfoUpdated', onContactUpdated);

    if (config.environment === 'development') {
      socket.on('connect_error', (err) => {
        console.warn('[mobile] /chat connect_error', err.message);
      });
    }

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('newMessage', onNewMessage);
      socket.off('contactInfoUpdated', onContactUpdated);
      socket.disconnect();
      socketRef.current = null;
      historyRoomRef.current = null;
    };
  }, [session, brand?.id, brand?.subdomain]);

  const subscribeNewMessage = useCallback((listener: MessageListener) => {
    messageListeners.current.add(listener);
    return () => {
      messageListeners.current.delete(listener);
    };
  }, []);

  const subscribeContactUpdated = useCallback((listener: ContactListener) => {
    contactListeners.current.add(listener);
    return () => {
      contactListeners.current.delete(listener);
    };
  }, []);

  const joinHistoryRoom = useCallback(
    (opts: { subDomain: string; phoneNumber?: string; agentStateId?: string }) => {
      const subDomain = opts.subDomain.trim();
      const phoneNumber = opts.phoneNumber?.trim() || undefined;
      const agentStateId = opts.agentStateId?.trim() || undefined;
      if (!subDomain || (!agentStateId && !phoneNumber)) return;

      const room = { subDomain, phoneNumber, agentStateId };
      historyRoomRef.current = room;
      const socket = socketRef.current;
      if (!socket?.connected) return;
      emitHistoryRoom(socket, room);
    },
    [],
  );

  const clearHistoryRoom = useCallback(() => {
    historyRoomRef.current = null;
  }, []);

  const value: ChatSocketContextValue = {
    subscribeNewMessage,
    subscribeContactUpdated,
    joinHistoryRoom,
    clearHistoryRoom,
  };

  return (
    <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>
  );
};

export function useChatSocket(): ChatSocketContextValue {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    return {
      subscribeNewMessage: () => () => undefined,
      subscribeContactUpdated: () => () => undefined,
      joinHistoryRoom: () => undefined,
      clearHistoryRoom: () => undefined,
    };
  }
  return ctx;
}
