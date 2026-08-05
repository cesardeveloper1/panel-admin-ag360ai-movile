import { useCallback, useEffect, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import {
  businessOutline,
  colorPaletteOutline,
  megaphoneOutline,
  micOutline,
  notificationsOutline,
  restaurantOutline,
  sendOutline,
  sparklesOutline,
  stopCircleOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { AGILITO_PATH, NOTIFICATIONS_PATH, PROFILE_PATH } from '../navigation/navConfig';
import { setModuleNavFrom } from '../navigation/moduleNavFrom';
import { AgentToggle } from '../components/AgentToggle';

interface AgilitoMessage {
  id: string;
  role: 'user' | 'assistant';
  textKey?: string;
  text?: string;
  voice?: boolean;
}

const modules = [
  { path: '/app/products', icon: restaurantOutline, labelKey: 'agilito.menuTitle' },
  { path: '/app/clients', icon: megaphoneOutline, labelKey: 'agilito.marketingTitle' },
  { path: '/app/locations', icon: businessOutline, labelKey: 'agilito.locationsTitle' },
  { path: '/app/datos-marca', icon: colorPaletteOutline, labelKey: 'agilito.brandTitle' },
] as const;

const AgilitoPage: React.FC = () => {
  const { t } = useTranslation();
  const { go, goRoot } = useAppNavigation();
  const { brand, session, notifications, startBrandSwitch, showToast } = useApp();
  const avatar = session?.initials ?? brand?.initials ?? '?';
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

  const handleBackToBrands = () => {
    startBrandSwitch();
    window.setTimeout(() => goRoot('/welcome'), 80);
  };

  return (
    <IonPage>
      <IonContent className="ag-screen agilito-screen welcome-screen">
        <AppShell agilitoChrome>
          <div className="agilito-layout">
            <header className="agilito-top">
              <div className="agilito-top-row">
                <button
                  type="button"
                  className="welcome-back"
                  onClick={handleBackToBrands}
                  aria-label={t('agilito.backBrand')}
                >
                  <IonIcon icon={storefrontOutline} aria-hidden="true" />
                </button>

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
                  <button
                    type="button"
                    className="ag-avatar ag-avatar--btn agilito-top-avatar"
                    onClick={() => go(PROFILE_PATH)}
                    aria-label={t('nav.profile')}
                  >
                    {avatar}
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
                        {modules.map((mod) => (
                          <button
                            key={mod.path}
                            type="button"
                            className="agilito-modules-item"
                            onClick={() => {
                              setModuleNavFrom(AGILITO_PATH);
                              go(mod.path);
                            }}
                          >
                            <IonIcon icon={mod.icon} aria-hidden="true" />
                            <span>{t(mod.labelKey)}</span>
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
          </div>
        </AppShell>

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
