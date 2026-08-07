import { CHATS_PATH } from './navConfig';

/**
 * Origen al abrir Chats desde otra pantalla (Ionic no conserva bien location.state).
 * null = entrada “nativa” al módulo Chats (inbox).
 */
let chatNavFrom: string | null = null;

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
