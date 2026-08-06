import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { NotificationCard } from '../components/NotificationCard';
import { useApp } from '../context/AppContext';

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
              onClick: () => markAllNotificationsRead(),
            }
          : undefined
      }
    >
      {notifications.length === 0 ? (
        <div className="module-empty">{t('notifications.empty')}</div>
      ) : (
        <ul className="notification-list">
          {notifications.map((item) => (
            <li key={item.id}>
              <NotificationCard item={item} onPress={() => markNotificationRead(item.id)} />
            </li>
          ))}
        </ul>
      )}
    </StackLayout>
  );
};

export default NotificationsPage;
