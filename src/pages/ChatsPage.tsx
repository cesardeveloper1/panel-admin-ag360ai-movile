import { useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import { chatbubbleEllipsesOutline, logoWhatsapp, sendOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  clearChatNavFrom,
  getChatNavFrom,
  hasExternalChatOrigin,
} from '../navigation/chatNavFrom';
import { apiMock } from '../services/apiMock';
import type { ChatConversation, ChatMessage } from '../types';
import { avatarColor } from '../utils/avatarColor';

const ChatsPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand } = useApp();
  const { back } = useAppNavigation();
  const location = useLocation();
  const [items, setItems] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [sending, setSending] = useState(false);
  const [openedFromExternal, setOpenedFromExternal] = useState(() => hasExternalChatOrigin());
  const [deepLinkSettled, setDeepLinkSettled] = useState(
    () => !new URLSearchParams(window.location.search).get('customer'),
  );
  const threadEndRef = useRef<HTMLDivElement>(null);
  const prevCustomerKeyRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('customer'),
  );

  const customerKeyFromUrl = useMemo(
    () => new URLSearchParams(location.search).get('customer'),
    [location.search],
  );
  const awaitingDeepLink = Boolean(customerKeyFromUrl) && !selected && !deepLinkSettled;
  const showThread = Boolean(selected) || awaitingDeepLink;

  useEffect(() => {
    if (!brand) return;
    void apiMock.getChats(brand.id).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [brand]);

  useEffect(() => {
    const resetToInbox = () => {
      setSelected(null);
      setDraft('');
      setOpenedFromExternal(false);
      setDeepLinkSettled(true);
    };
    window.addEventListener('ag:chats-inbox', resetToInbox);
    return () => window.removeEventListener('ag:chats-inbox', resetToInbox);
  }, []);

  useEffect(() => {
    const prev = prevCustomerKeyRef.current;
    prevCustomerKeyRef.current = customerKeyFromUrl;

    if (!customerKeyFromUrl) {
      setDeepLinkSettled(true);
      // Salimos de un deep-link (?customer= → limpio): volver al inbox
      if (prev) {
        setSelected(null);
        setDraft('');
        setOpenedFromExternal(false);
      }
      return;
    }
    setDeepLinkSettled(false);
    if (hasExternalChatOrigin()) setOpenedFromExternal(true);
  }, [customerKeyFromUrl]);

  useEffect(() => {
    if (!customerKeyFromUrl || loading) return;
    const matchingChat = items.find((item) => item.nameKey === customerKeyFromUrl);
    if (matchingChat) {
      setSelected(matchingChat);
      if (hasExternalChatOrigin()) setOpenedFromExternal(true);
    }
    setDeepLinkSettled(true);
  }, [items, customerKeyFromUrl, loading]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    setThreadLoading(true);
    void apiMock.getChatMessages(selected.id).then((data) => {
      setMessages(data);
      setThreadLoading(false);
    });
  }, [selected]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = t(item.nameKey).toLowerCase();
      return name.includes(q) || item.phone.includes(q);
    });
  }, [items, query, t]);

  const onOpenChat = (chat: ChatConversation) => {
    setSelected(chat);
    setDraft('');
  };

  const onBackFromThread = () => {
    if (openedFromExternal) {
      const origin = getChatNavFrom();
      clearChatNavFrom();
      setOpenedFromExternal(false);
      setSelected(null);
      setDraft('');
      if (origin) back(origin);
      return;
    }
    setSelected(null);
    setDraft('');
  };

  const onSend = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    const sent = await apiMock.sendChatMessage(selected.id, draft.trim());
    setMessages((prev) => [...prev, sent]);
    setDraft('');
    setSending(false);
  };

  const threadTitle = selected
    ? t(selected.nameKey)
    : customerKeyFromUrl
      ? t(customerKeyFromUrl)
      : t('chats.title');
  const threadSubtitle = selected?.phone ?? undefined;
  const threadBreadcrumbs = [
    { label: t('nav.chats') },
    { label: threadTitle },
  ];

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
                              <p>{body}</p>
                              <span>{msg.time}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={threadEndRef} />
                    </div>
                  )}
                </div>

                <div className="chat-composer">
                  <input
                    className="chat-composer__input"
                    value={draft}
                    placeholder={t('chats.placeholder')}
                    disabled={!selected || sending}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void onSend();
                    }}
                  />
                  <button
                    type="button"
                    className="chat-composer__send"
                    disabled={!selected || !draft.trim() || sending}
                    aria-label={t('chats.send')}
                    onClick={() => void onSend()}
                  >
                    <IonIcon icon={sendOutline} />
                  </button>
                </div>
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
                      filtered.map((chat) => (
                        <button
                          key={chat.id}
                          type="button"
                          className="chat-row"
                          onClick={() => onOpenChat(chat)}
                        >
                          <div
                            className="chat-row-avatar"
                            style={{ backgroundColor: avatarColor(chat.id || chat.nameKey) }}
                            aria-hidden="true"
                          >
                            {t(chat.nameKey).slice(0, 1)}
                          </div>
                          <div className="chat-row-main">
                            <div className="chat-row-top">
                              <strong>{t(chat.nameKey)}</strong>
                              <span>{chat.time}</span>
                            </div>
                            <div className="chat-row-bottom">
                              <p>{t(chat.lastMessageKey)}</p>
                              {chat.unread > 0 ? <span className="chat-row-badge">{chat.unread}</span> : null}
                            </div>
                            <span className={`chat-row-bot${chat.botActive ? ' chat-row-bot--on' : ''}`}>
                              {chat.botActive ? t('chats.botOn') : t('chats.botOff')}
                            </span>
                          </div>
                          <IonIcon icon={chatbubbleEllipsesOutline} className="chat-row-chevron" />
                        </button>
                      ))
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
