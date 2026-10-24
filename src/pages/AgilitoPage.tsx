import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import {
  barChartOutline,
  closeOutline,
  gridOutline,
  menuOutline,
  micOutline,
  notificationsOutline,
  personOutline,
  sendOutline,
  sparklesOutline,
  stopCircleOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppShell } from '../components/AppShell';
import { PanelChatIcon } from '../components/PanelChatIcon';
import { AgentToggle } from '../components/AgentToggle';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import { AGILITO_PATH, CHATS_PATH, NOTIFICATIONS_PATH, OPERATIONS_PATH, PAYMENTS_PATH, PROFILE_PATH, REPORTS_PATH } from '../navigation/navConfig';
import { BUSINESS_MODULES } from '../navigation/businessModules';
import { setModuleNavFrom } from '../navigation/moduleNavFrom';
import { canNavigate } from '../navigation/navigationAccess';
import { requestChatsInbox } from '../navigation/chatNavFrom';

interface AgilitoMessage {
  id: string;
  role: 'user' | 'assistant';
  textKey?: string;
  text?: string;
  voice?: boolean;
}

const AgilitoPage: React.FC = () => {
  const { t } = useTranslation();
  const { go, goRoot } = useAppNavigation();
  const { notifications, showToast, session, startBrandSwitch } = useApp();
  const { isTablet } = useViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPresent, setMenuPresent] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [messages, setMessages] = useState<AgilitoMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const unread = notifications.filter((n) => n.unread).length;

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const reply = useCallback(
    (userText: string, voice = false) => {
      setThinking(true);
      window.setTimeout(() => {
        const lower = userText.toLowerCase();
        let textKey = voice ? 'agilito.voiceReply' : 'agilito.replyDefault';
        if (!voice) {
          if (lower.includes('men') || lower.includes('menu') || lower.includes('product'))
            textKey = 'agilito.replyMenu';
          else if (lower.includes('client') || lower.includes('marketing') || lower.includes('crm'))
            textKey = 'agilito.replyMarketing';
          else if (lower.includes('marca') || lower.includes('brand') || lower.includes('logo'))
            textKey = 'agilito.replyBrand';
          else if (lower.includes('local') || lower.includes('sede')) textKey = 'agilito.replyLocations';
        }

        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', textKey }]);
        setThinking(false);
        scrollToBottom();
      }, voice ? 900 : 650);
    },
    [],
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking || isRecording) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setInput('');
    scrollToBottom();
    reply(trimmed);
  };

  const stopMedia = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => stopMedia(), [stopMedia]);

  useEffect(() => {
    if (menuOpen) setMenuPresent(true);
    else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMenuPresent(false);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuPresent) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.body.classList.add('agilito-nav-open');
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('agilito-nav-open');
      document.removeEventListener('keydown', onKey);
      if (!menuOpen) menuButtonRef.current?.focus();
    };
  }, [menuOpen, menuPresent]);

  const destinations = [
    { path: OPERATIONS_PATH, icon: gridOutline, labelKey: 'ops.title' },
    { path: CHATS_PATH, icon: '', labelKey: 'nav.chats' },
    { path: REPORTS_PATH, icon: barChartOutline, labelKey: 'nav.reports' },
    { path: PAYMENTS_PATH, icon: storefrontOutline, labelKey: 'nav.payments' },
    ...BUSINESS_MODULES.map((mod) => ({ path: mod.path, icon: mod.icon, labelKey: mod.i18n.agilitoLabel })),
    { path: NOTIFICATIONS_PATH, icon: notificationsOutline, labelKey: 'nav.alerts' },
    { path: PROFILE_PATH, icon: personOutline, labelKey: 'nav.profile' },
  ].filter((item) => canNavigate(session, item.path));

  const openDestination = (path: string) => {
    setMenuOpen(false);
    if (BUSINESS_MODULES.some((mod) => mod.path === path)) setModuleNavFrom(AGILITO_PATH);
    if (path === CHATS_PATH) {
      requestChatsInbox();
      goRoot(CHATS_PATH, 'replace', true);
      return;
    }
    go(path);
  };

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      stopMedia();
      return;
    }
    recorder.stop();
  }, [stopMedia]);

  const startRecording = async () => {
    if (thinking || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('agilito.micUnavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopMedia();
        setMessages((prev) => [
          ...prev,
          { id: `u-${Date.now()}`, role: 'user', textKey: 'agilito.voiceSent', voice: true },
        ]);
        scrollToBottom();
        reply('', true);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      showToast('agilito.micDenied');
      stopMedia();
      setIsRecording(false);
    }
  };

  return (
    <IonPage data-ag-route="/app/agilito">
      <IonContent className="ag-screen agilito-screen welcome-screen">
        <AppShell agilitoChrome>
          <div className="agilito-layout">
            <header className="agilito-top">
              <div className={`agilito-top-row${isTablet ? '' : ' agilito-top-row--menu'}`}>
                {isTablet ? null : (
                  <button
                    ref={menuButtonRef}
                    type="button"
                    className="agilito-menu-trigger"
                    aria-label={t('nav.sidebar')}
                    aria-expanded={menuPresent}
                    aria-controls="agilito-nav"
                    onClick={() => setMenuOpen(true)}
                  >
                    <IonIcon icon={menuOutline} aria-hidden="true" />
                  </button>
                )}
                <div className="agilito-top-trailing">
                  <AgentToggle />
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
              <div ref={listRef} className="agilito-messages">
                {messages.length === 0 && !thinking ? (
                  <div className="agilito-empty">
                    <h2 className="agilito-empty-title">{t('agilito.heroHint')}</h2>
                    <div className="agilito-modules-card" aria-label={t('agilito.modulesTitle')}>
                      <div className="agilito-modules-track">
                        {BUSINESS_MODULES.map((mod) => (
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
                    <div className={`agilito-msg-body${msg.voice ? ' agilito-msg-body--voice' : ''}`}>
                      {msg.voice ? (
                        <div className="agilito-voice-note" aria-label={t('agilito.voiceSent')}>
                          <IonIcon icon={micOutline} aria-hidden="true" />
                          <span>{t(msg.textKey ?? 'agilito.voiceSent')}</span>
                        </div>
                      ) : (
                        <p>{msg.text ?? t(msg.textKey ?? '')}</p>
                      )}
                    </div>
                  </article>
                ))}

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
              <div className={`agilito-composer-inner${isRecording ? ' agilito-composer-inner--recording' : ''}`}>
                {isRecording ? (
                  <>
                    <div className="agilito-composer-recording" aria-live="polite">
                      <span className="agilito-composer-rec-dot" aria-hidden="true" />
                      <span className="agilito-composer-rec-label">{t('agilito.recording')}</span>
                      <div className="agilito-composer-wave" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="agilito-composer-stop"
                      onClick={stopRecording}
                      aria-label={t('agilito.stopRecording')}
                    >
                      <IonIcon icon={stopCircleOutline} />
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      className="agilito-composer-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t('agilito.placeholder')}
                      aria-label={t('agilito.placeholder')}
                    />
                    {input.trim() ? (
                      <button type="submit" className="agilito-composer-send" disabled={thinking}>
                        <IonIcon icon={sendOutline} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="agilito-composer-mic"
                        onClick={() => void startRecording()}
                        disabled={thinking}
                        aria-label={t('agilito.recordAudio')}
                      >
                        <AgilitoVoiceLines />
                      </button>
                    )}
                  </>
                )}
              </div>
            </form>
          </div>
        </AppShell>
        {menuPresent ? createPortal(
          <div
            className={`agilito-nav-layer${menuOpen ? ' is-open' : ' is-closing'}`}
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget || event.animationName !== 'agilito-nav-out') return;
              setMenuPresent(false);
            }}
          >
            <aside id="agilito-nav" className="agilito-nav" role="dialog" aria-modal="true" aria-label={t('nav.sidebar')}>
              <div className="agilito-nav__head">
                <strong>{t('nav.agilito')}</strong>
                <button type="button" className="agilito-nav__close" onClick={() => setMenuOpen(false)} aria-label={t('common.close')}>
                  <IonIcon icon={closeOutline} aria-hidden="true" />
                </button>
              </div>
              <nav className="agilito-nav__list">
                {destinations.map((item, index) => (
                  <button
                    key={item.path}
                    type="button"
                    className="agilito-nav__item"
                    style={{ animationDelay: `${48 + index * 32}ms` }}
                    onClick={() => openDestination(item.path)}
                  >
                    {item.path === CHATS_PATH ? <PanelChatIcon /> : <IonIcon icon={item.icon} aria-hidden="true" />}
                    <span>{t(item.labelKey)}</span>
                  </button>
                ))}
              </nav>
              <button
                type="button"
                className="agilito-nav__item agilito-nav__brand"
                style={{ animationDelay: `${48 + destinations.length * 32}ms` }}
                onClick={() => {
                  setMenuOpen(false);
                  startBrandSwitch();
                  goRoot('/welcome', 'replace', true);
                }}
              >
                <IonIcon icon={storefrontOutline} aria-hidden="true" />
                <span>{t('settings.changeBrand')}</span>
              </button>
            </aside>
          </div>,
          document.body,
        ) : null}
      </IonContent>
    </IonPage>
  );
};

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

export default AgilitoPage;
