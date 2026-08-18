import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import { chatbubbleEllipsesOutline, logoWhatsapp } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { ChatComposer } from '../components/ChatComposer';
import { useApp } from '../hooks/useApp';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  clearChatNavFrom,
  getChatNavFrom,
  hasExternalChatOrigin,
} from '../navigation/chatNavFrom';
import { apiFacade } from '../services/apiFacade';
import {
  applyInboxMessageUpdate,
  cacheChatInbox,
  createChatInboxCacheKey,
  createChatInboxCacheScope,
  getCachedChatInbox,
  updateCachedChatInboxes,
  upsertInboxConversation,
} from '../services/chatInboxState';
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
  const { brand, session, showToast } = useApp();
  const { back } = useAppNavigation();
  const location = useLocation();
  const {
    subscribeNewMessage,
    subscribeContactUpdated,
    joinHistoryRoom,
    clearHistoryRoom,
  } = useChatSocket();

  const [items, setItems] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [nextHistoryCursor, setNextHistoryCursor] = useState<string | undefined>();
  const [botStateUpdating, setBotStateUpdating] = useState(false);
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
  const threadMessagesRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<ChatConversation | null>(null);
  const itemsRef = useRef<ChatConversation[]>([]);
  const queryRef = useRef('');
  const inboxRequestIdRef = useRef(0);
  const inboxRefreshTimerRef = useRef<number | null>(null);
  const seenMessageIdsRef = useRef(new Set<string>());
  selectedRef.current = selected;
  queryRef.current = query;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

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
  const inboxCacheScope = useMemo(
    () =>
      brand
        ? createChatInboxCacheScope({
            brandId: brand.id,
            sessionEmail: session?.email || 'anonymous',
            subDomain: brand.subdomain,
          })
        : '',
    [brand?.id, brand?.subdomain, session?.email],
  );

  const loadInbox = useCallback(
    async (search?: string) => {
      if (!brand || !inboxCacheScope) return;
      const cacheKey = createChatInboxCacheKey(inboxCacheScope, search);
      const cached = getCachedChatInbox(cacheKey);
      const requestId = ++inboxRequestIdRef.current;
      if (cached) {
        itemsRef.current = cached;
        setItems(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      try {
        const data = await apiFacade.getChatConversations(brand, search);
        if (requestId !== inboxRequestIdRef.current) return;
        cacheChatInbox(cacheKey, data);
        itemsRef.current = data;
        setItems(data);
      } catch {
        if (requestId !== inboxRequestIdRef.current) return;
        if (cached) return;
        itemsRef.current = [];
        setItems([]);
        showToast('chats.loadError');
      } finally {
        if (requestId === inboxRequestIdRef.current) setLoading(false);
      }
    },
    [brand, inboxCacheScope, showToast],
  );

  const scheduleInboxRefresh = useCallback(() => {
    if (inboxRefreshTimerRef.current !== null) {
      window.clearTimeout(inboxRefreshTimerRef.current);
    }
    inboxRefreshTimerRef.current = window.setTimeout(() => {
      inboxRefreshTimerRef.current = null;
      void loadInbox(queryRef.current.trim() || undefined);
    }, 300);
  }, [loadInbox]);

  useEffect(() => {
    return () => {
      if (inboxRefreshTimerRef.current !== null) {
        window.clearTimeout(inboxRefreshTimerRef.current);
      }
    };
  }, []);

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
      const sub = chat.subDomain || brand.subdomain;
      if (sub) {
        joinHistoryRoom({
          subDomain: sub,
          phoneNumber: chat.phone || undefined,
          agentStateId: chat.agentStateId || chat.id,
        });
      }
      setThreadLoading(true);
      try {
        const page = await apiFacade.getChatMessagesPage({
          chatId: chat.id,
          phone: chat.phone,
          agentStateId: chat.agentStateId || chat.id,
          subDomain: chat.subDomain || brand.subdomain,
        });
        setMessages(page.messages);
        setNextHistoryCursor(page.nextCursor);

        if (sub && chat.phone) {
          const unreadIds = page.messages
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
      } catch {
        setMessages([]);
        setNextHistoryCursor(undefined);
        showToast('chats.historyError');
      } finally {
        setThreadLoading(false);
      }
    },
    [brand, joinHistoryRoom, showToast],
  );

  useEffect(() => {
    if (!selected) {
      clearHistoryRoom();
      setMessages([]);
      setNextHistoryCursor(undefined);
      return;
    }
    void loadThread(selected);
    return () => clearHistoryRoom();
  }, [selected, loadThread, clearHistoryRoom]);

  const loadOlderMessages = async () => {
    if (!selected || !nextHistoryCursor || olderMessagesLoading || !brand) return;
    const container = threadMessagesRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    setOlderMessagesLoading(true);
    try {
      const page = await apiFacade.getChatMessagesPage({
        chatId: selected.id,
        phone: selected.phone,
        agentStateId: selected.agentStateId || selected.id,
        subDomain: selected.subDomain || brand.subdomain,
        cursor: nextHistoryCursor,
      });
      setMessages((current) => {
        const existing = new Set(current.map((message) => message.id));
        return [...page.messages.filter((message) => !existing.has(message.id)), ...current];
      });
      setNextHistoryCursor(page.nextCursor);
      window.requestAnimationFrame(() => {
        if (container) container.scrollTop += container.scrollHeight - previousHeight;
      });
    } catch {
      showToast('chats.loadOlderError');
    } finally {
      setOlderMessagesLoading(false);
    }
  };

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selected]);

  useEffect(() => {
    return subscribeNewMessage((payload) => {
      const current = selectedRef.current;
      const eventId = payload._id || payload.id;
      if (eventId) {
        if (seenMessageIdsRef.current.has(eventId)) return;
        seenMessageIdsRef.current.add(eventId);
        if (seenMessageIdsRef.current.size > 300) {
          seenMessageIdsRef.current.delete(seenMessageIdsRef.current.values().next().value!);
        }
      }

      const samePhone = Boolean(current && phonesMatch(payload.phoneNumber, current.phone));
      const sameBsuid =
        Boolean(current && payload.clientBsuid && current.clientBsuid) &&
        payload.clientBsuid === current?.clientBsuid;
      const isCurrentConversation = samePhone || sameBsuid;
      const updateInbox = (chats: ChatConversation[]) =>
        applyInboxMessageUpdate(
          chats,
          payload,
          !isCurrentConversation && payload.sender === 'user',
        );
      const updatedInbox = updateInbox(itemsRef.current);
      if (updatedInbox) {
        itemsRef.current = updatedInbox;
        setItems(updatedInbox);
      }
      if (inboxCacheScope) {
        updateCachedChatInboxes(inboxCacheScope, (chats) => updateInbox(chats) || chats);
      }

      if (!updatedInbox) scheduleInboxRefresh();
      if (!current || !isCurrentConversation) return;

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
  }, [subscribeNewMessage, inboxCacheScope, scheduleInboxRefresh, brand?.subdomain]);

  useEffect(() => {
    return subscribeContactUpdated((payload) => {
      const info = payload.contactInfo;
      if (!info || !brand) return;
      if (inboxRefreshTimerRef.current !== null) {
        window.clearTimeout(inboxRefreshTimerRef.current);
        inboxRefreshTimerRef.current = null;
      }
      const mapped = mapContactToConversation(info, brand.id);
      const updatedItems = upsertInboxConversation(itemsRef.current, mapped);
      itemsRef.current = updatedItems;
      setItems(updatedItems);
      if (inboxCacheScope) {
        const defaultCacheKey = createChatInboxCacheKey(inboxCacheScope);
        updateCachedChatInboxes(inboxCacheScope, (chats, key) => {
          const merged = upsertInboxConversation(chats, mapped);
          return key === defaultCacheKey || merged.length === chats.length ? merged : chats;
        });
      }
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
  }, [subscribeContactUpdated, brand, inboxCacheScope]);

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

  const onToggleConversationBot = async () => {
    if (!selected || botStateUpdating) return;

    const chatId = selected.id;
    const nextState = !selected.botActive;
    setBotStateUpdating(true);
    try {
      await apiFacade.setConversationBotState(selected, nextState);
      setSelected((current) =>
        current?.id === chatId ? { ...current, botActive: nextState } : current,
      );
      setItems((current) =>
        current.map((chat) =>
          chat.id === chatId ? { ...chat, botActive: nextState } : chat,
        ),
      );
    } catch {
      showToast('chats.botStateError');
    } finally {
      setBotStateUpdating(false);
    }
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
  const threadBreadcrumbs = [{ label: t('nav.chats') }, { label: threadTitle }];

  return (
    <IonPage>
      <IonContent className="ag-screen" scrollY={!showThread}>
        <AppShell lockScroll={showThread} hideMobileMenu={showThread}>
          {showThread ? (
            <>
              <AppHeader
                title={threadTitle}
                onBack={onBackFromThread}
                breadcrumbs={threadBreadcrumbs}
                trailing={
                  selected ? (
                    <div className="chat-header-meta">
                      <span className="chat-header-meta__phone">{selected.phone}</span>
                      <button
                        type="button"
                        className={`chat-header-bot-toggle${selected.botActive ? ' chat-header-bot-toggle--on' : ''}`}
                        onClick={() => void onToggleConversationBot()}
                        disabled={botStateUpdating}
                        aria-pressed={selected.botActive}
                        aria-label={selected.botActive ? t('chats.pauseBot') : t('chats.activateBot')}
                      >
                        {botStateUpdating ? <IonSpinner name="crescent" /> : selected.botActive ? t('chats.botOn') : t('chats.botOff')}
                      </button>
                    </div>
                  ) : null
                }
              />
              <div className="ag-body module-body chats-body chats-body--thread">
                <div className="chat-thread">
                  {awaitingDeepLink || threadLoading || !selected ? (
                    <div className="module-loading">
                      <IonSpinner name="crescent" />
                    </div>
                  ) : (
                    <div ref={threadMessagesRef} className="chat-thread-messages">
                      {nextHistoryCursor ? (
                        <button
                          type="button"
                          className="chat-thread__load-older"
                          onClick={() => void loadOlderMessages()}
                          disabled={olderMessagesLoading}
                        >
                          {olderMessagesLoading ? <IonSpinner name="crescent" /> : t('chats.loadOlder')}
                        </button>
                      ) : null}
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
