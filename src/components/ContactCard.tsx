import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { chatbubbleEllipsesOutline } from 'ionicons/icons';
import type { CSSProperties } from 'react';
import type { ContactInfo } from '../types/contact';
import { getFunnelStage, resolveContactDisplayName } from '../utils/funnelStage';

interface ContactCardProps {
  contact: ContactInfo;
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

export function ContactCard({ contact, onClick, onChat, style }: ContactCardProps) {
  const { t } = useTranslation();
  const stage = getFunnelStage(contact);
  const name = resolveContactDisplayName(contact);
  const phone = contact.clientPhone?.trim() || '—';
  const preview = contact.lastMessageContent?.trim() || t('ops.funnel.noPreview');
  const unread = contact.unreadMessages > 0 ? contact.unreadMessages : 0;

  return (
    <article
      className={`contact-card ${STAGE_CLASS[stage] ?? ''}`}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
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
      <p className="contact-card__preview">{preview}</p>
      {onChat ? (
        <button
          type="button"
          className="contact-card__chat"
          aria-label={t('ops.funnel.openChat')}
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
        >
          <IonIcon icon={chatbubbleEllipsesOutline} />
        </button>
      ) : null}
    </article>
  );
}
