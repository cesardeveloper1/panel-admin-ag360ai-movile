import { CHATS_PATH } from './navConfig';

/**
 * Origen al abrir Chats desde otra pantalla (Ionic no conserva bien location.state).
 * null = entrada “nativa” al módulo Chats (inbox).
 */
let chatNavFrom: string | null = null;
let chatsInboxRequestId = 0;

export function setChatNavFrom(path: string | null) {
  chatNavFrom = path;
}

export function getChatNavFrom() {
  return chatNavFrom;
}

export function clearChatNavFrom() {
  chatNavFrom = null;
}

/** True si hay un origen distinto al propio módulo Chats. */
export function hasExternalChatOrigin() {
  return Boolean(chatNavFrom && chatNavFrom !== CHATS_PATH);
}

/**
 * Pedir el inbox limpio (desde sidebar / menú).
 * Limpia origen deep-link y notifica a ChatsPage si ya está montada.
 */
export function requestChatsInbox() {
  clearChatNavFrom();
  chatsInboxRequestId += 1;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ag:chats-inbox', { detail: { id: chatsInboxRequestId } }),
    );
  }
  return chatsInboxRequestId;
}

export function getChatsInboxRequestId() {
  return chatsInboxRequestId;
}
