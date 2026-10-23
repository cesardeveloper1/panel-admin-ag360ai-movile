import type { ContactInfo } from '../../types/contact';
import type { ChatConversation, ChatMessage, ChatMessageRole } from '../../types';
import { resolveContactDisplayName } from '../../utils/funnelStage';

export interface ApiChatMessage {
  _id?: string;
  id?: string;
  content?: string;
  sender?: string;
  phoneNumber?: string;
  clientName?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
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
  mediaUrl?: string;
  mediaType?: string;
}

function formatChatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function mapSenderToRole(sender?: string): ChatMessageRole {
  if (sender === 'device') return 'agent';
  if (sender === 'ai') return 'bot';
  return 'customer';
}

export function mapContactToConversation(
  contact: ContactInfo,
  brandId: string,
): ChatConversation {
  const displayName = resolveContactDisplayName(contact);
  const activity = contact.lastMessageAt || contact.lastActivity;
  return {
    id: contact._id,
    agentStateId: contact._id,
    phone: contact.clientPhone?.trim() || '',
    clientBsuid: contact.clientBsuid,
    subDomain: contact.subDomain,
    nameKey: 'customers.unknown',
    displayName,
    lastMessageKey: 'chats.noPreview',
    lastMessage: contact.lastMessageContent?.trim() || undefined,
    time: formatChatTime(activity),
    unread: contact.unreadMessages ?? 0,
    botActive: contact.isActive === true,
    brandId,
    channel: contact.channel,
  };
}

export function mapApiMessageToChatMessage(
  msg: ApiChatMessage,
  chatId: string,
): ChatMessage | null {
  const id = msg._id || msg.id;
  if (!id) return null;
  const senderRaw =
    msg.sender === 'user' || msg.sender === 'ai' || msg.sender === 'device'
      ? msg.sender
      : undefined;
  const firstAttachment = msg.metadata?.attachments?.[0];
  const mediaUrl = msg.mediaUrl || firstAttachment?.url;
  const declaredType = msg.metadata?.messageType;
  const mediaFromType = declaredType === 'image' || declaredType === 'audio'
    || declaredType === 'video' || declaredType === 'document'
    ? declaredType
    : undefined;
  const mediaType = msg.mediaType || firstAttachment?.type || mediaFromType;
  return {
    id,
    chatId,
    role: mapSenderToRole(msg.sender),
    text: msg.content ?? '',
    time: formatChatTime(msg.createdAt),
    createdAt: msg.createdAt,
    status: msg.status,
    mediaUrl,
    mediaType,
    messageType: msg.metadata?.messageType,
    attachments: msg.metadata?.attachments,
    interactiveReply: msg.metadata?.interactive
      ? { kind: msg.metadata.interactive.kind, title: msg.metadata.interactive.buttonTitle }
      : undefined,
    storyMentionUrl: msg.metadata?.additional?.incoming?.storyMentionUrl,
    contentNoticeAccepted: msg.metadata?.additional?.contentNotice?.state === 'accepted',
    referral: msg.metadata?.referral,
    botStatusKind: msg.metadata?.additional?.kind,
    senderRaw,
  };
}

export function sortMessagesChronologically(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}
