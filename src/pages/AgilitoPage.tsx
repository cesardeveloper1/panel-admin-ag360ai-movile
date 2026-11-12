import { Capacitor } from '@capacitor/core';
import { openExternalUrl } from '../utils/openExternalUrl';
import { useEffect, useId, useRef, useState } from 'react';
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import {
  notificationsOutline,
  sendOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppShell } from '../components/AppShell';
import { AgentControls } from '../components/AgentControls';
import { AgentToggle } from '../components/AgentToggle';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { AGILITO_PATH, NOTIFICATIONS_PATH } from '../navigation/navConfig';
import { BUSINESS_MODULES } from '../navigation/businessModules';
import { setModuleNavFrom } from '../navigation/moduleNavFrom';
import { canNavigate } from '../navigation/navigationAccess';

import { getRoute } from '../navigation/appRouteRegistry';
import { api } from '../services/api';
import { readAgilitoSession, saveAgilitoSession } from '../utils/agilitoSession';

interface PriceProposal {
  id: string;
  type: 'product.price.update';
  productName: string;
  scope: string;
  currency: string;
  currentPrice: string;
  newPrice: string;
}

interface Reply {
  conversationId: string;
  source?: 'mcp';
  confirmationUrl?: string;
  messageId: string;
  text: string;
  links: { routeKey: string; label: string }[];
  proposal?: PriceProposal;
}

type Message =
  | { id: string; role: 'user'; text: string }
  | ({ id: string; role: 'assistant' } & Reply);
type ProposalAction = 'confirm' | 'cancel';
type ProposalResult =
  | { status: 'applied'; price: string }
  | { status: 'cancelled' }
  | { status: 'error'; key: string; retry?: ProposalAction };

const endpoint = '/support/agilito';

const destinations = new Map([
  ['categories', '/app/menu/categories'],
  ['modifiers', '/app/menu/modifiers'],
  ['groups', '/app/menu/groups'],
  ['reservations', '/app/reservations/config'],
  ['zones', '/app/locations/zones'],
  ['gallery', '/app/locations/gallery'],
  ['operations', '/app/operations'],
  ['chats', '/app/chats'],
  ['quick_messages', '/app/quick-messages'],
  ['templates', '/app/marketing/templates'],
  ['campaigns', '/app/marketing/campaigns'],
  ['orders_report', '/app/reports/orders'],
  ['integration_sales', '/app/reports/integration-sales'],
  ['order_map', '/app/reports/order-map'],
  ['cash_close', '/app/reports/cash-close'],
  ['cancelled_orders', '/app/reports/cancelled'],
  ['digital_menu', '/app/menu/digital'],
  ['branch_integrations', '/app/locations/integrations'],
  ['local_config', '/app/menu/local'],
  ['agilink', '/app/agilink'],
  ['profile', '/app/profile'],
  ['tutorials', '/app/help'],
  ['reports', '/app/reports'],
  ['payments', '/app/payments'],
  ['printing', '/app/printing'],
  ['payment_capture', '/app/payment-capture'],
  ['business', '/app/business'],
  ['notifications', '/app/notifications'],
  ['menu_integrations', '/app/menu/integrations'],
  ['complaints', '/app/marketing/complaints'],
  ['branch_survey', '/app/marketing/branch-survey'],
]);

function unwrap(response: Awaited<ReturnType<typeof api.post>>) {
  if (response?.success !== true || !response.data || typeof response.data !== 'object') {
    throw response ?? new Error('Empty Agilito response');
  }
  return response.data;
}

interface SavedChat {
  threadId: string;
  messages: Message[];
  conversationId?: string;
  proposalResults: Record<string, ProposalResult>;
}

function AgilitoChat({ scope }: { scope: string }) {
  const [saved] = useState(() => readAgilitoSession<SavedChat>(scope));
  const [threadId, setThreadId] = useState(() => saved?.threadId ?? crypto.randomUUID());
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { notifications, showToast, session, brand, ordersFilters } = useApp();
  const [agentOpen, setAgentOpen] = useState(false);
  const agentRef = useRef<HTMLDivElement>(null);
  const agentMenuId = useId();
  const [messages, setMessages] = useState<Message[]>(saved?.messages ?? []);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{ id: string; text: string } | undefined>(() => {
    const last = saved?.messages.at(-1);
    return last?.role === 'user' ? last : undefined;
  });
  const [proposalResults, setProposalResults] = useState<Record<string, ProposalResult>>(saved?.proposalResults ?? {});
  const listRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<string | undefined>(saved?.conversationId);
  const unread = notifications.filter((n) => n.unread).length;

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    saveAgilitoSession(scope, { threadId, messages, conversationId: conversationRef.current, proposalResults });
  }, [scope, threadId, messages, proposalResults]);

  function clearChat() {
    if (requestRef.current) return;
    conversationRef.current = undefined;
    setThreadId(crypto.randomUUID());
    setMessages([]);
    setInput('');
    setFailedMessage(undefined);
    setProposalResults({});
  }

  async function runRequest(work: (signal: AbortSignal) => Promise<void>) {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setThinking(true);
    try {
      await work(controller.signal);
    } finally {
      requestRef.current = null;
      if (!controller.signal.aborted) {
        setThinking(false);
        scrollToBottom();
      }
    }
  }

  function sendMessage(message: { id: string; text: string }) {
    void runRequest(async (signal) => {
      setFailedMessage(undefined);
      try {
        const reply = unwrap(await api.post(endpoint + '/messages', {
          clientMessageId: message.id,
          conversationId: conversationRef.current,
          threadId,
          text: message.text,
          surface: 'mobile',
          branchId: ordersFilters.branchId || undefined,
          routeKey: 'agilito',
        }, { signal, headers: { 'X-Agilito-Brand-Id': brand?.id ?? '' } })) as Reply;
        if (signal.aborted) return;
        if (typeof reply.text !== 'string' || !reply.messageId || !reply.conversationId || !Array.isArray(reply.links)) {
          throw new Error('Incomplete Agilito reply');
        }
        if (reply.source !== 'mcp') conversationRef.current = reply.conversationId;
        setMessages((previous) => [...previous, { ...reply, id: reply.messageId, role: 'assistant' }]);
      } catch {
        if (!signal.aborted) setFailedMessage(message);
      }
    });
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || requestRef.current || failedMessage) return;
    const message = { id: crypto.randomUUID(), text: trimmed };
    setMessages((previous) => [...previous, { ...message, role: 'user' }]);
    setInput('');
    scrollToBottom();
    sendMessage(message);
  }

  useEffect(() => {
    if (!agentOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!agentRef.current?.contains(event.target as Node)) setAgentOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAgentOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [agentOpen]);

  const [connection, setConnection] = useState<{ available: boolean; linked: boolean }>();
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      void api.get('/owner-mcp/agilito/status', { signal: controller.signal }).then(response => {
        if (!controller.signal.aborted) setConnection(unwrap(response));
      }).catch(() => {});
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('agilito-connection-return', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('agilito-connection-return', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function toggleConnection() {
    if (!connection || connectionBusy) return;
    setConnectionBusy(true);
    setConnectionError(false);
    try {
      if (connection.linked) {
        await api.delete('/owner-mcp/agilito/connection');
        setConnection({ available: true, linked: false });
      } else {
        const result = unwrap(await api.post('/owner-mcp/agilito/start', { platform: Capacitor.isNativePlatform() ? 'mobile' : 'web' }));
        const url = new URL(result.authorizationUrl);
        if (url.protocol !== 'https:') throw new Error('Invalid authorization URL');
        await openExternalUrl(url.href);
      }
    } catch {
      setConnectionError(true);
    } finally {
      setConnectionBusy(false);
    }
  }


  return (
    <IonPage data-ag-route="/app/agilito">
      <IonContent className="ag-screen agilito-screen welcome-screen">
        <AppShell agilitoChrome lockScroll>
          <div className="agilito-layout">
            <header className="agilito-top">
              <div className="agilito-top-row">
                <div className="agilito-top-trailing">
                {connection?.available && (
                  <IonButton disabled={connectionBusy} onClick={() => void toggleConnection()}>
                    {connection.linked ? 'Desvincular cuenta' : 'Vincular cuenta'}
                  </IonButton>
                )}
                {connectionError && <p role="alert">No se pudo actualizar la conexión con Agilito.</p>}
                  {messages.length > 0 && (
                    <IonButton fill="clear" disabled={thinking} onClick={clearChat}>
                      {t('agilito.clearChat')}
                    </IonButton>
                  )}
                  <div className="agilito-agent" ref={agentRef}>
                    <AgentToggle
                      appearance="icon"
                      onPress={() => setAgentOpen((open) => !open)}
                      expanded={agentOpen}
                      controlsId={agentMenuId}
                    />
                    {agentOpen ? (
                      <div id={agentMenuId} className="ag-header-status__panel agilito-agent-panel" role="menu">
                        <AgentControls />
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="agilito-top-bell"
                    aria-label={t('nav.alerts')}
                    onClick={() => go(NOTIFICATIONS_PATH)}
                  >
                    <IonIcon icon={notificationsOutline} />
                    {unread > 0 ? <span className="ag-header-bell-badge">{unread}</span> : null}
                  </button>
                </div>
              </div>
            </header>

            <div className="agilito-body">
              <div ref={listRef} className="agilito-messages" role="log" aria-label={t('agilito.chatTitle')} aria-live="polite">
                {messages.length === 0 && !thinking ? (
                  <div className="agilito-empty">
                    <span className="agilito-empty-symbol" aria-hidden="true"><IonIcon icon={sparklesOutline} /></span>
                    <div className="agilito-intro">
                      <h2 className="agilito-empty-title">{t('agilito.chatTitle')}</h2>
                      <p>{t('agilito.heroHint')}</p>
                    </div>
                    <div className="agilito-modules-card" aria-label={t('agilito.modulesTitle')}>
                      <h3 className="agilito-section-label">{t('agilito.modulesTitle')}</h3>
                      <div className="agilito-modules-track">
                        {BUSINESS_MODULES.filter((mod) => canNavigate(session, mod.path, { locations: brand?.locations })).map((mod) => (
                          <button
                            key={mod.id}
                            type="button"
                            className="agilito-modules-item"
                            onClick={() => {
                              setModuleNavFrom(AGILITO_PATH);
                              go(mod.path);
                            }}
                          >
                            <IonIcon icon={mod.icon} aria-hidden="true" />
                            <span>{t(mod.i18n.agilitoLabel)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {messages.map((msg) => (
                  <article key={msg.id} className={`agilito-msg agilito-msg--${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      <span className="agilito-msg-avatar" aria-hidden="true">
                        <IonIcon icon={sparklesOutline} />
                      </span>
                    ) : null}
                    <div className="agilito-msg-body">
                      <p>{msg.role === 'assistant' ? msg.text.replace(/\*\*([^*]+)\*\*/g, '$1') : msg.text}</p>
                      {msg.role === 'assistant' && msg.source === 'mcp' && msg.confirmationUrl?.startsWith('https://') && (
                        <IonButton onClick={() => void openExternalUrl(msg.confirmationUrl!)}>Revisar cambio</IonButton>
                      )}
                      {msg.role === 'assistant' && msg.links.map(({ routeKey, label }) => {
                        const path = BUSINESS_MODULES.find((module) => module.id === routeKey)?.path
                          ?? destinations.get(routeKey);
                        return path && getRoute(path) && canNavigate(session, path, { locations: brand?.locations }) ? (
                          <IonButton key={routeKey} className="agilito-navigation-link" onClick={() => {
                            setModuleNavFrom(AGILITO_PATH);
                            go(path);
                          }}>{t('agilito.goTo', { label })}</IonButton>
                        ) : null;
                      })}
                      {msg.role === 'assistant' && msg.proposal?.type === 'product.price.update' && (
                        <ProposalCard proposal={msg.proposal} result={proposalResults[msg.proposal.id]} />
                      )}
                    </div>
                  </article>
                ))}

                {failedMessage && (
                  <div className="agilito-msg agilito-msg--assistant">
                    <div className="agilito-msg-body">
                      <p role="alert">{t('agilito.sendFailed')}</p>
                      <IonButton fill="clear" disabled={thinking} onClick={() => sendMessage(failedMessage)}>
                        {t('agilito.retry')}
                      </IonButton>
                    </div>
                  </div>
                )}

                {thinking ? (
                  <div className="agilito-msg agilito-msg--assistant agilito-msg--thinking">
                    <span className="agilito-msg-avatar" aria-hidden="true">
                      <IonIcon icon={sparklesOutline} />
                    </span>
                    <div className="agilito-msg-body">
                      <IonSpinner name="crescent" />
                      <span>{t('agilito.thinking')}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <form
              className="agilito-composer-dock"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <div className="agilito-composer-inner">
                <input
                  className="agilito-composer-input"
                  value={input}
                  maxLength={4000}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t('agilito.placeholder')}
                  aria-label={t('agilito.placeholder')}
                />
                {input.trim() ? (
                  <button type="submit" className="agilito-composer-send" disabled={thinking || Boolean(failedMessage)} aria-label={t('chats.send')}>
                    <IonIcon icon={sendOutline} />
                  </button>
                ) : (
                  <button type="button" className="agilito-composer-mic"
                    onClick={() => showToast('agilito.voiceTextOnly')} aria-label={t('agilito.voiceTextOnly')}>
                    <AgilitoVoiceLines />
                  </button>
                )}
              </div>
            </form>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
}

function AgilitoVoiceLines() {
  return (
    <span className="agilito-voice-lines" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function ProposalCard({ proposal, result }: {
  proposal: PriceProposal;
  result?: ProposalResult;
}) {
  const { t } = useTranslation();
  return (
    <section className="agilito-proposal" aria-label={t('agilito.priceProposal')}>
      <strong>{proposal.productName}</strong>
      <p>{proposal.scope}</p>
      <p>{t('agilito.priceBefore', { currency: proposal.currency, price: proposal.currentPrice })}</p>
      <p>{t('agilito.priceAfter', { currency: proposal.currency, price: proposal.newPrice })}</p>
      {result && <p role="status">{result.status === 'applied'
        ? t('agilito.priceSaved', { currency: proposal.currency, price: result.price })
        : result.status === 'cancelled' ? t('agilito.proposalCancelled') : t('agilito.' + result.key)}</p>}
    </section>
  );
}

export default function AgilitoPage() {
  const { session, brand, ordersFilters } = useApp();
  const scope = JSON.stringify([session?.id ?? session?.email, brand?.id, ordersFilters.branchId ?? null]);
  return <AgilitoChat key={scope} scope={scope} />;
}
