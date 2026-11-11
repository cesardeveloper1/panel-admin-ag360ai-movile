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
  const { notifications, showToast, session, brand } = useApp();
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
          routeKey: 'agilito',
        }, { signal, headers: { 'X-Agilito-Brand-Id': brand?.id ?? '' } })) as Reply;
        if (signal.aborted) return;
        if (typeof reply.text !== 'string' || !reply.messageId || !reply.conversationId || !Array.isArray(reply.links)) {
          throw new Error('Incomplete Agilito reply');
        }
        conversationRef.current = reply.conversationId;
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

  function resolveProposal(proposal: PriceProposal, action: ProposalAction) {
    void runRequest(async (signal) => {
      let result: ProposalResult;
      try {
        const response = unwrap(await api.post(
          endpoint + '/proposals/' + encodeURIComponent(proposal.id) + '/' + action,
          undefined,
          { signal, headers: {
            'X-Agilito-Brand-Id': brand?.id ?? '',
            ...(action === 'confirm' ? { 'Idempotency-Key': proposal.id } : {}),
          } },
        )) as { status?: string; savedPrice?: string };
        if (action === 'confirm' && response.status === 'applied' && typeof response.savedPrice === 'string') {
          result = { status: 'applied', price: response.savedPrice };
        } else if (action === 'cancel' && response.status === 'cancelled') {
          result = { status: 'cancelled' };
        } else {
          throw new Error('Unexpected Agilito proposal status');
        }
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
        switch (code) {
          case 'PROPOSAL_EXPIRED': result = { status: 'error', key: 'proposalExpired' }; break;
          case 'PRICE_CONFLICT': result = { status: 'error', key: 'priceConflict' }; break;
          case 'FORBIDDEN': result = { status: 'error', key: 'proposalForbidden' }; break;
          default: result = { status: 'error', key: 'proposalRetry', retry: action };
        }
      }
      if (!signal.aborted) setProposalResults((previous) => ({ ...previous, [proposal.id]: result }));
    });
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

  return (
    <IonPage data-ag-route="/app/agilito">
      <IonContent className="ag-screen agilito-screen welcome-screen">
        <AppShell agilitoChrome lockScroll>
          <div className="agilito-layout">
            <header className="agilito-top">
              <div className="agilito-top-row">
                <div className="agilito-top-trailing">
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
                      {msg.role === 'assistant' && msg.links.map(({ routeKey, label }) => {
                        const path = BUSINESS_MODULES.find((module) => module.id === routeKey)?.path;
                        return path && getRoute(path) && canNavigate(session, path, { locations: brand?.locations }) ? (
                          <IonButton key={routeKey} className="agilito-navigation-link" onClick={() => {
                            setModuleNavFrom(AGILITO_PATH);
                            go(path);
                          }}>{t('agilito.goTo', { label })}</IonButton>
                        ) : null;
                      })}
                      {msg.role === 'assistant' && msg.proposal?.type === 'product.price.update' && (
                        <ProposalCard proposal={msg.proposal} result={proposalResults[msg.proposal.id]}
                          busy={thinking} onResolve={resolveProposal} />
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

function ProposalCard({ proposal, result, busy, onResolve }: {
  proposal: PriceProposal;
  result?: ProposalResult;
  busy: boolean;
  onResolve: (proposal: PriceProposal, action: ProposalAction) => void;
}) {
  const { t } = useTranslation();
  const canChoose = !result || (result.status === 'error' && Boolean(result.retry));
  const retry = result?.status === 'error' ? result.retry : undefined;
  return (
    <section className="agilito-proposal" aria-label={t('agilito.priceProposal')}>
      <strong>{proposal.productName}</strong>
      <p>{proposal.scope}</p>
      <p>{t('agilito.priceBefore', { currency: proposal.currency, price: proposal.currentPrice })}</p>
      <p>{t('agilito.priceAfter', { currency: proposal.currency, price: proposal.newPrice })}</p>
      {result && <p role="status">{result.status === 'applied'
        ? t('agilito.priceSaved', { currency: proposal.currency, price: result.price })
        : result.status === 'cancelled' ? t('agilito.proposalCancelled') : t('agilito.' + result.key)}</p>}
      {canChoose && (
        <div className="agilito-proposal-actions">
          {retry !== 'cancel' && <IonButton disabled={busy} onClick={() => onResolve(proposal, 'confirm')}>{t('agilito.confirmPrice')}</IonButton>}
          {retry !== 'confirm' && <IonButton fill="outline" disabled={busy} onClick={() => onResolve(proposal, 'cancel')}>{t('agilito.cancelProposal')}</IonButton>}
        </div>
      )}
    </section>
  );
}

export default function AgilitoPage() {
  const { session, brand } = useApp();
  const scope = JSON.stringify([session?.id ?? session?.email, brand?.id]);
  return <AgilitoChat key={scope} scope={scope} />;
}
