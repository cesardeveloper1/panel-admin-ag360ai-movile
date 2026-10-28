import React, { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { config } from '../config/env';
import { useAuthToken } from '../hooks/useAuthToken';
import { resolveSocketBaseUrl } from '../utils/resolveSocketBaseUrl';
import { useApp } from '../hooks/useApp';
import { acceptCue, deliverNotificationCue, startNotificationCues } from '../notifications/deliverNotificationCue';
import { chatCueForNewMessage, chatCueForTransition, resolveChatSoundKey } from '../notifications/notificationCues';
import {
  ChatSocketContext,
  type ChatNewMessagePayload,
  type ChatSocketContextValue,
  type ContactInfoUpdatedPayload,
} from './chatSocketContext';

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

/**
 * Socket.IO `/chat`: join subdomain + agent-states; newMessage / contactInfoUpdated.
 */
export const ChatSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, brand } = useApp();
  const { t } = useTranslation();
  const token = useAuthToken();
  const socketRef = useRef<Socket | null>(null);
  const historyRoomRef = useRef<HistoryRoomOptions | null>(null);
  const messageListeners = useRef(new Set<MessageListener>());
  const contactListeners = useRef(new Set<ContactListener>());
  const chatSoundKeys = useRef(new Map<string, string>());

  useEffect(() => {
    if (config.useApiMock) return;
    if (!session || !brand?.subdomain?.trim()) return;

    if (!token) return;

    startNotificationCues();
    chatSoundKeys.current.clear();
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
      const sound = chatCueForNewMessage(payload);
      const messageId = payload._id || payload.id || payload.createdAt || '';
      if (sound && acceptCue(`chat:${messageId}`)) {
        const identity = payload.phoneNumber || payload.clientBsuid || payload.agentStateId || messageId;
        void deliverNotificationCue({
          sound,
          cardKey: `chat:${subDomain}:${identity || 'latest'}`,
          title: t('cues.chatTitle'),
          body: payload.clientName ? t('cues.chatBody', { name: payload.clientName }) : t('cues.chatBodyPlain'),
        });
      }
      messageListeners.current.forEach((fn) => fn(payload));
    };

    const onContactUpdated = (payload: ContactInfoUpdatedPayload) => {
      const infoSub = payload.contactInfo?.subDomain || payload.subDomain;
      if (infoSub && infoSub !== subDomain) return;
      const contact = payload.contactInfo;
      if (contact) {
        const identity = contact.clientPhone || contact.clientBsuid || contact._id;
        const mapKey = `${subDomain}:${identity}`;
        const previous = chatSoundKeys.current.get(mapKey);
        const next = resolveChatSoundKey(contact);
        chatSoundKeys.current.set(mapKey, next);
        const sound = chatCueForTransition(previous, next);
        if (sound && acceptCue(`chat-state:${mapKey}:${next}`)) {
          void deliverNotificationCue({
            sound,
            cardKey: `chat:${subDomain}:${identity || 'latest'}`,
            title: t(sound === 'humano' ? 'cues.humanTitle' : 'cues.chatTitle'),
            body: contact.clientName ? t('cues.chatBody', { name: contact.clientName }) : t('cues.chatBodyPlain'),
          });
        }
      }
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
  }, [session, brand?.id, brand?.subdomain, token, t]);

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

