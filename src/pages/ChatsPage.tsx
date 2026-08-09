import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import { chatbubbleEllipsesOutline, logoWhatsapp } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { ChatComposer } from '../components/ChatComposer';
import { useApp } from '../context/AppContext';
import { useChatSocket } from '../context/ChatSocketProvider';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  clearChatNavFrom,
  getChatNavFrom,
  hasExternalChatOrigin,
} from '../navigation/chatNavFrom';
import { apiFacade } from '../services/apiFacade';
import { mapApiMessageToChatMessage, mapContactToConversation } from '../services/mappers/chatMapper';
import type { ChatConversation, ChatMessage } from '../types';
import { avatarColor } from '../utils/avatarColor';
import { ChatMessageBody } from '../utils/chatMessageFormat';

function conversationLabel(
  chat: ChatConversation | null,
  t: (key: string) => string,
): string {
  if (!chat) return '';
  if (chat.displayName?.trim()) return chat.displayName.trim();
  if (chat.nameKey && chat.nameKey !== 'customers.unknown') {
    const translated = t(chat.nameKey);
    if (translated !== chat.nameKey) return translated;
  }
  return chat.phone || t('chats.unknownContact');
}

function phonesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const na = a.replace(/\D/g, '');
  const nb = b.replace(/\D/g, '');
  if (!na || !nb) return false;
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

const ChatsPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const { back } = useAppNavigation();
  const location = useLocation();
  const { subscribeNewMessage, subscribeContactUpdated, joinHistoryRoom } = useChatSocket();

  const [items, setItems] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [openedFromExternal, setOpenedFromExternal] = useState(() => hasExternalChatOrigin());
  const [deepLinkSettled, setDeepLinkSettled] = useState(
    () =>
      !new URLSearchParams(window.location.search).get('customer') &&
      !new URLSearchParams(window.location.search).get('phone') &&
      !new URLSearchParams(window.location.search).get('agentStateId'),
  );
  const threadEndRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<ChatConversation | null>(null);
  selectedRef.current = selected;

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const customerKeyFromUrl = searchParams.get('customer');
  const phoneFromUrl = searchParams.get('phone');
  const agentStateIdFromUrl = searchParams.get('agentStateId');
  const hasDeepLink = Boolean(customerKeyFromUrl || phoneFromUrl || agentStateIdFromUrl);

  const prevDeepLinkRef = useRef<string | null>(
    [customerKeyFromUrl, phoneFromUrl, agentStateIdFromUrl].filter(Boolean).join('|') || null,
  );

  const awaitingDeepLink = hasDeepLink && !selected && !deepLinkSettled;
  const showThread = Boolean(selected) || awaitingDeepLink;

  const searchBootstrapped = useRef(false);

  const loadInbox = useCallback(
    async (search?: string) => {
      if (!brand) return;
      setLoading(true);
      try {
        const data = await apiFacade.getChatConversations(brand, search);
        setItems(data);
      } catch {
        setItems([]);
        showToast('chats.loadError');
      } finally {
        setLoading(false);
      }
    },
    [brand, showToast],
  );

  useEffect(() => {
    if (!brand) return;
    searchBootstrapped.current = false;
    void loadInbox();
  }, [brand?.id, brand?.subdomain, loadInbox]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const search = query.trim();
      if (!searchBootstrapped.current) {
        searchBootstrapped.current = true;
        if (!search) return;
      }
      if (!brand) return;
      void loadInbox(search || undefined);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query, brand, loadInbox]);

  useEffect(() => {
    const resetToInbox = () => {
      setSelected(null);
      setOpenedFromExternal(false);
      setDeepLinkSettled(true);
    };
    window.addEventListener('ag:chats-inbox', resetToInbox);
    return () => window.removeEventListener('ag:chats-inbox', resetToInbox);
  }, []);

  useEffect(() => {
    const key = [customerKeyFromUrl, phoneFromUrl, agentStateIdFromUrl]
      .filter(Boolean)
      .join('|');
    const prev = prevDeepLinkRef.current;
    prevDeepLinkRef.current = key || null;

    if (!key) {
      setDeepLinkSettled(true);
      if (prev) {
        setSelected(null);
        setOpenedFromExternal(false);
      }
      return;
    }
    setDeepLinkSettled(false);
    if (hasExternalChatOrigin()) setOpenedFromExternal(true);
  }, [customerKeyFromUrl, phoneFromUrl, agentStateIdFromUrl]);

  useEffect(() => {
    if (!hasDeepLink || loading) return;

    let matching =
      (agentStateIdFromUrl
        ? items.find(
            (item) =>
              item.agentStateId === agentStateIdFromUrl || item.id === agentStateIdFromUrl,
          )
        : undefined) ||
      (phoneFromUrl
        ? items.find((item) => phonesMatch(item.phone, phoneFromUrl))
        : undefined) ||
      (customerKeyFromUrl
        ? items.find((item) => item.nameKey === customerKeyFromUrl)
        : undefined);

    if (!matching && (phoneFromUrl || agentStateIdFromUrl) && brand) {
      matching = {
        id: agentStateIdFromUrl || phoneFromUrl || 'deep-link',
        agentStateId: agentStateIdFromUrl || undefined,
        phone: phoneFromUrl || '',
        nameKey: 'customers.unknown',
        displayName: phoneFromUrl || t('chats.unknownContact'),
        lastMessageKey: 'chats.noPreview',
        time: '',
        unread: 0,
        botActive: true,
        brandId: brand.id,
        subDomain: brand.subdomain,
      };
    }

    if (matching) {
      setSelected(matching);
      if (hasExternalChatOrigin()) setOpenedFromExternal(true);
    }
    setDeepLinkSettled(true);
  }, [
    items,
    loading,
    hasDeepLink,
    customerKeyFromUrl,
    phoneFromUrl,
    agentStateIdFromUrl,
    brand,
    t,
  ]);

  const loadThread = useCallback(
    async (chat: ChatConversation) => {
      if (!brand) return;
      setThreadLoading(true);
      try {
        const data = await apiFacade.getChatMessages({
          chatId: chat.id,
          phone: chat.phone,
          agentStateId: chat.agentStateId || chat.id,
          subDomain: chat.subDomain || brand.subdomain,
        });
        setMessages(data);

        const sub = chat.subDomain || brand.subdomain;
        if (sub && chat.phone) {
          const unreadIds = data
            .filter(
              (m) =>
                m.senderRaw === 'user' &&
                m.id &&
                !m.id.startsWith('local-') &&
                (!m.status || m.status === 'sent' || m.status === 'delivered'),
            )
            .map((m) => m.id);
          if (unreadIds.length > 0) {
            void apiFacade.markChatAsRead({
              clientPhone: chat.phone,
              subDomain: sub,
              messageIds: unreadIds,
            });
          }
        }

        if (sub) {
          joinHistoryRoom({
            subDomain: sub,
            phoneNumber: chat.phone || undefined,
            agentStateId: chat.agentStateId || chat.id,
          });
        }
      } catch {
        setMessages([]);
        showToast('chats.historyError');
      } finally {
        setThreadLoading(false);
      }
    },
    [brand, joinHistoryRoom, showToast],
  );

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    void loadThread(selected);
  }, [selected, loadThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selected]);

  useEffect(() => {
    return subscribeNewMessage((payload) => {
      const current = selectedRef.current;
      if (!current) {
        void loadInbox(query.trim() || undefined);
        return;
      }
      const samePhone = phonesMatch(payload.phoneNumber, current.phone);
      const sameBsuid =
        Boolean(payload.clientBsuid && current.clientBsuid) &&
        payload.clientBsuid === current.clientBsuid;
      if (!samePhone && !sameBsuid) {
        void loadInbox(query.trim() || undefined);
        return;
      }
      const mapped = mapApiMessageToChatMessage(
        {
          _id: payload._id || payload.id,
          content: payload.content,
          sender: payload.sender,
          createdAt: payload.createdAt || new Date().toISOString(),
          phoneNumber: payload.phoneNumber,
          clientName: payload.clientName,
        },
        current.id,
      );
      if (!mapped) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === mapped.id)) return prev;
        return [...prev, mapped];
      });
      if (current.phone && brand?.subdomain && mapped.senderRaw === 'user') {
        void apiFacade.markChatAsRead({
          clientPhone: current.phone,
          subDomain: brand.subdomain,
          messageIds: [mapped.id],
        });
      }
    });
  }, [subscribeNewMessage, loadInbox, query, brand?.subdomain]);

  useEffect(() => {
    return subscribeContactUpdated((payload) => {
      const info = payload.contactInfo;
      if (!info || !brand) return;
      const mapped = mapContactToConversation(info, brand.id);
      setItems((prev) => {
        const idx = prev.findIndex(
          (c) =>
            c.id === mapped.id ||
            phonesMatch(c.phone, mapped.phone) ||
            (c.clientBsuid && c.clientBsuid === mapped.clientBsuid),
        );
        if (idx < 0) return [mapped, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], ...mapped };
        return next;
      });
      setSelected((prev) => {
        if (!prev) return prev;
        if (
          prev.id === mapped.id ||
          phonesMatch(prev.phone, mapped.phone) ||
          (prev.clientBsuid && prev.clientBsuid === mapped.clientBsuid)
        ) {
          return { ...prev, ...mapped };
        }
        return prev;
      });
    });
  }, [subscribeContactUpdated, brand]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !apiFacade.useMock) return items;
    return items.filter((item) => {
      const name = conversationLabel(item, t).toLowerCase();
      return name.includes(q) || item.phone.includes(q);
    });
  }, [items, query, t]);

  const onOpenChat = (chat: ChatConversation) => {
    setSelected(chat);
  };

  const onBackFromThread = () => {
    if (openedFromExternal) {
      const origin = getChatNavFrom();
      clearChatNavFrom();
      setOpenedFromExternal(false);
      setSelected(null);
      if (origin) back(origin);
      return;
    }
    setSelected(null);
  };

  const onComposerSent = (sent: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
    if (!selected) return;
    setItems((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              lastMessage: sent.text || c.lastMessage,
              time: sent.time || c.time,
              unread: 0,
            }
          : c,
      ),
    );
  };

  const threadTitle = selected
    ? conversationLabel(selected, t)
    : phoneFromUrl ||
      (customerKeyFromUrl ? t(customerKeyFromUrl) : t('chats.title'));
  const threadSubtitle = selected?.phone ?? phoneFromUrl ?? undefined;
  const threadBreadcrumbs = [{ label: t('nav.chats') }, { label: threadTitle }];

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
          {showThread ? (
            <>
              <AppHeader
                title={threadTitle}
                subtitle={threadSubtitle}
                onBack={onBackFromThread}
                breadcrumbs={threadBreadcrumbs}
                showAlerts
              />
              <div className="ag-body module-body chats-body chats-body--thread">
                {selected ? (
                  <div className="chat-thread-meta">
                    <span className={`chat-row-bot${selected.botActive ? ' chat-row-bot--on' : ''}`}>
                      {selected.botActive ? t('chats.botOn') : t('chats.botOff')}
                    </span>
                    <span className="chat-thread-meta__phone">{selected.phone}</span>
                  </div>
                ) : null}

                <div className="chat-thread">
                  {awaitingDeepLink || threadLoading || !selected ? (
                    <div className="module-loading">
                      <IonSpinner name="crescent" />
                    </div>
                  ) : (
                    <div className="chat-thread-messages">
                      {messages.map((msg) => {
                        const isOutbound = msg.role === 'agent' || msg.role === 'bot';
                        const body = msg.textKey ? t(msg.textKey) : msg.text ?? '';
                        return (
                          <div
                            key={msg.id}
                            className={`chat-bubble-row${isOutbound ? ' chat-bubble-row--out' : ' chat-bubble-row--in'}`}
                          >
                            <div className={`chat-bubble chat-bubble--${msg.role}`}>
                              <ChatMessageBody
                                content={body}
                                mediaUrl={msg.mediaUrl}
                                mediaType={msg.mediaType}
                              />
                              <span className="chat-bubble__time">{msg.time}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={threadEndRef} />
                    </div>
                  )}
                </div>

                <ChatComposer
                  chat={selected}
                  brandId={brand?.id || ''}
                  subDomain={brand?.subdomain || selected?.subDomain || ''}
                  disabled={!selected}
                  onSent={onComposerSent}
                  onError={(key) => showToast(key)}
                />
              </div>
            </>
          ) : (
            <>
              <AppHeader centeredCompact title={t('chats.title')} showAlerts />
              <div className="ag-body module-body chats-body ag-page-stack">
                <div className="chats-status ag-enter">
                  <IonIcon icon={logoWhatsapp} className="chats-status-icon chats-status-icon--brand" />
                  <div>
                    <strong>{t('chats.connected')}</strong>
                    <p>{t('chats.connectedHint')}</p>
                  </div>
                </div>

                <IonSearchbar
                  className="chats-search ag-enter"
                  value={query}
                  onIonInput={(e) => setQuery(e.detail.value ?? '')}
                  placeholder={t('chats.search')}
                  debounce={200}
                />

                {loading ? (
                  <div className="module-loading">
                    <IonSpinner name="crescent" />
                  </div>
                ) : (
                  <div className="chats-list ag-enter">
                    {filtered.length === 0 ? (
                      <p className="chats-empty">{t('chats.empty')}</p>
                    ) : (
                      filtered.map((chat) => {
                        const label = conversationLabel(chat, t);
                        const preview =
                          chat.lastMessage ||
                          (chat.lastMessageKey ? t(chat.lastMessageKey) : '');
                        return (
                          <button
                            key={chat.id}
                            type="button"
                            className="chat-row"
                            onClick={() => onOpenChat(chat)}
                          >
                            <div
                              className="chat-row-avatar"
                              style={{ backgroundColor: avatarColor(chat.id || chat.phone) }}
                              aria-hidden="true"
                            >
                              {label.slice(0, 1)}
                            </div>
                            <div className="chat-row-main">
                              <div className="chat-row-top">
                                <strong>{label}</strong>
                                <span>{chat.time}</span>
                              </div>
                              <div className="chat-row-bottom">
                                <p>{preview}</p>
                                {chat.unread > 0 ? (
                                  <span className="chat-row-badge">{chat.unread}</span>
                                ) : null}
                              </div>
                              <span className={`chat-row-bot${chat.botActive ? ' chat-row-bot--on' : ''}`}>
                                {chat.botActive ? t('chats.botOn') : t('chats.botOff')}
                              </span>
                            </div>
                            <IonIcon icon={chatbubbleEllipsesOutline} className="chat-row-chevron" />
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default ChatsPage;
