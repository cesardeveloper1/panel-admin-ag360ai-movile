import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { personOutline, cartOutline, cardOutline, locationOutline } from 'ionicons/icons';
import { ChannelIcon, channelLabel } from './ChannelIcon';
import type { CSSProperties } from 'react';
import type { ContactInfo } from '../types/contact';
import { contactProgress } from '../utils/contactPresentation';
import { getFunnelStage, resolveContactDisplayName } from '../utils/funnelStage';
import { interactivePreview } from '../utils/interactiveChatMarker';

interface ContactCardProps {
  contact: ContactInfo;
  attentionLocation?: string;
  onClick?: () => void;
  onChat?: () => void;
  style?: CSSProperties;
}

const STAGE_CLASS: Record<string, string> = {
  INICIAL: 'contact-card--inicial',
  PIDIENDO: 'contact-card--pidiendo',
  HUMANO: 'contact-card--humano',
  CON_PEDIDO: 'contact-card--pedido',
};

export function ContactCard({ contact, attentionLocation, onClick, onChat, style }: ContactCardProps) {
  const { t } = useTranslation();
  const stage = getFunnelStage(contact);
  const name = resolveContactDisplayName(contact);
  const phone = contact.clientPhone?.trim() || '—';
  const preview = interactivePreview(contact.lastMessageContent ?? '') || t('ops.funnel.noPreview');
  const steps = contactProgress(contact);
  const icons = { name: personOutline, cart: cartOutline, delivery: cardOutline, payment: cardOutline };
  const channel = channelLabel(contact.channel);
  const unread = contact.unreadMessages > 0 ? contact.unreadMessages : 0;

  return (
    <article
      className={`contact-card ${STAGE_CLASS[stage] ?? ''}`}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="contact-card__row">
        <div className="contact-card__identity">
          <div className="contact-card__name">{name}</div>
          <span className="contact-card__phone">{phone}</span>
          {attentionLocation ? <span className="contact-card__location"><IonIcon icon={locationOutline} aria-hidden="true" />{attentionLocation}</span> : null}
        </div>
        <div className="contact-card__meta">
          <span className={`contact-card__badge contact-card__badge--${stage.toLowerCase()}`}>
            {t(`ops.funnel.stages.${stage}`)}
          </span>
          {unread > 0 ? (
            <span className="contact-card__unread" aria-label={t('ops.funnel.unread', { count: unread })}>
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </div>
      </div>
      <div className="contact-card__progress" role="group" aria-label={t('ops.funnel.progress.label')}>
        {steps.map(({ field, state }) => {
          const label = `${t(`ops.funnel.progress.fields.${field}`)}: ${t(`ops.funnel.progress.states.${state}`)}`;
          return <span key={field} className={`contact-card__step contact-card__step--${state}`} role="img" aria-label={label} title={label}>
            {field === 'delivery' ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 5h11v12H3zM14 9h4l3 4v4h-7" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" />
            </svg> : <IonIcon icon={icons[field]} aria-hidden="true" />}
          </span>;
        })}
      </div>
      <div className="contact-card__footer">
      <p className="contact-card__preview">{preview}</p>
      {onChat ? (
        <button
          type="button"
          className="contact-card__chat"
          aria-label={`${t('ops.funnel.openChat')} · ${channel}`}
          title={channel}
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
        >
          <ChannelIcon channel={contact.channel} />
        </button>
      ) : null}
      </div>
    </article>
  );
}
