import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { notificationsOutline, checkmarkDoneOutline } from 'ionicons/icons';
import { StackLayout } from '../components/layouts';
import { NotificationCard } from '../components/NotificationCard';
import { useApp } from '../hooks/useApp';

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  return (
    <StackLayout
      title={t('notifications.title')}
      showAlerts={false}
      profileFromAvatar={false}
      bodyClassName="ag-body module-body notifications-body ag-page-stack"
      action={
        notifications.some((n) => n.unread)
          ? {
              label: t('notifications.markAll'),
              onClick: () => void markAllNotificationsRead(),
              icon: checkmarkDoneOutline,
              iconOnly: true,
            }
          : undefined
      }
    >
      {notifications.length === 0 ? (
        <div className="notifications-empty" role="status"><IonIcon icon={notificationsOutline} aria-hidden="true" /><p>{t('notifications.empty')}</p></div>
      ) : (
        <ul className="notification-list">
          {notifications.map((item) => (
            <li key={item.id}>
              <NotificationCard item={item} onPress={() => void markNotificationRead(item.id)} />
            </li>
          ))}
        </ul>
      )}
    </StackLayout>
  );
};

export default NotificationsPage;
