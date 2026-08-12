import { IonIcon } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import type { NotificationItem } from '../types';
import { getNotificationMeta } from '../utils/notificationMeta';

interface NotificationCardProps {
  item: NotificationItem;
  onPress: () => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ item, onPress }) => {
  const { t } = useTranslation();
  const meta = getNotificationMeta(item.kind);
  const complaint = item.complaint;
  const severityLabel = complaint?.severity
    ? t(`notifications.complaint.severity.${complaint.severity}`)
    : undefined;

  return (
    <button
      type="button"
      className={`notification-card notification-card--${item.kind}${item.unread ? ' notification-card--unread' : ' notification-card--read'}`}
      style={{
        ['--notif-accent' as string]: meta.accent,
        ['--notif-surface' as string]: meta.surface,
        ['--notif-border' as string]: meta.border,
        ['--notif-badge-bg' as string]: meta.badgeBg,
        ['--notif-badge-color' as string]: meta.badgeColor,
      }}
      onClick={onPress}
    >
      <span className="notification-card__rail" aria-hidden />
      <span className="notification-card__icon-wrap">
        <IonIcon icon={meta.icon} className="notification-card__icon" />
      </span>
      <span className="notification-card__content">
        <span className="notification-card__top">
          <span className="notification-card__badge">{t(meta.labelKey)}</span>
          {item.time ? <time className="notification-card__time">{item.time}</time> : null}
        </span>
        <span className="notification-card__title">{item.title ?? t(item.titleKey ?? '', item.params)}</span>
        {complaint ? (
          <span className="notification-card__complaint">
            <span className="notification-card__complaint-meta">
              {complaint.typeLabel ? <span className="notification-card__complaint-type">{complaint.typeLabel}</span> : null}
              {severityLabel ? (
                <span className={`notification-card__severity notification-card__severity--${complaint.severity}`}>
                  {severityLabel}
                </span>
              ) : null}
            </span>
            {complaint.clientPhone ? (
              <span className="notification-card__complaint-client">
                {t('notifications.complaint.client')}: {complaint.clientPhone}
              </span>
            ) : null}
            {complaint.description ? <span className="notification-card__body notification-card__complaint-description">{complaint.description}</span> : null}
            {complaint.actionTaken === 'agent_deactivated' ? (
              <span className="notification-card__complaint-action">
                {t('notifications.complaint.agentDeactivated')}
              </span>
            ) : null}
          </span>
        ) : item.body || item.bodyKey ? (
          <span className="notification-card__body">{item.body ?? t(item.bodyKey ?? '', item.params)}</span>
        ) : null}
      </span>
      {item.unread ? <span className="notification-card__dot" aria-label={t('notifications.unread')} /> : null}
    </button>
  );
};
