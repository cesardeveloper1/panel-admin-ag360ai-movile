import type { ChatConversation } from '../types';

export interface InboxMessageUpdate {
  clientBsuid?: string;
  content?: string;
  createdAt?: string;
  phoneNumber?: string;
  sender?: string;
}

const sessionInboxCache = new Map<string, ChatConversation[]>();

function phonesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const left = a.replace(/\D/g, '');
  const right = b.replace(/\D/g, '');
  return Boolean(left && right && (left === right || left.endsWith(right) || right.endsWith(left)));
}

function formatMessageTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function createChatInboxCacheScope(params: {
  brandId: string;
  sessionEmail: string;
  subDomain?: string;
}): string {
  return `${params.sessionEmail}|${params.brandId}|${params.subDomain?.trim() || ''}|`;
}

export function createChatInboxCacheKey(
  scope: string,
  search?: string,
): string {
  return `${scope}${search?.trim().toLocaleLowerCase('es-PE') || ''}`;
}

export function getCachedChatInbox(key: string): ChatConversation[] | undefined {
  return sessionInboxCache.get(key);
}

export function cacheChatInbox(key: string, chats: ChatConversation[]): void {
  sessionInboxCache.set(key, chats);
}

export function updateCachedChatInboxes(
  scope: string,
  update: (chats: ChatConversation[], key: string) => ChatConversation[],
): void {
  for (const [key, chats] of sessionInboxCache.entries()) {
    if (key.startsWith(scope)) sessionInboxCache.set(key, update(chats, key));
  }
}

export function upsertInboxConversation(
  chats: ChatConversation[],
  conversation: ChatConversation,
): ChatConversation[] {
  const index = chats.findIndex(
    (chat) =>
      chat.id === conversation.id ||
      phonesMatch(chat.phone, conversation.phone) ||
      Boolean(chat.clientBsuid && chat.clientBsuid === conversation.clientBsuid),
  );
  const next = index < 0 ? conversation : { ...chats[index], ...conversation };
  return [next, ...chats.filter((_, itemIndex) => itemIndex !== index)];
}

export function applyInboxMessageUpdate(
  chats: ChatConversation[],
  update: InboxMessageUpdate,
  incrementUnread: boolean,
): ChatConversation[] | null {
  const index = chats.findIndex(
    (chat) =>
      phonesMatch(chat.phone, update.phoneNumber) ||
      Boolean(chat.clientBsuid && chat.clientBsuid === update.clientBsuid),
  );
  if (index < 0) return null;

  const current = chats[index];
  const next: ChatConversation = {
    ...current,
    lastMessage: update.content?.trim() || current.lastMessage,
    time: formatMessageTime(update.createdAt) || current.time,
    unread: incrementUnread ? current.unread + 1 : current.unread,
  };
  return [next, ...chats.filter((_, itemIndex) => itemIndex !== index)];
}
