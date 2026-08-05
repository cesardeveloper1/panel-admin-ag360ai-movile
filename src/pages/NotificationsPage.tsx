import { useTranslation } from 'react-i18next';
import { IonContent, IonPage } from '@ionic/react';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { NotificationCard } from '../components/NotificationCard';
import { useApp } from '../context/AppContext';
import { useModuleNav } from '../hooks/useModuleNav';

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const { onBack } = useModuleNav();

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
          <AppHeader
            onBack={onBack}
            showAlerts={false}
            profileFromAvatar={false}
            title={t('notifications.title')}
            action={
              notifications.some((n) => n.unread)
                ? {
                    label: t('notifications.markAll'),
                    onClick: () => markAllNotificationsRead(),
                  }
                : undefined
            }
          />
          <div className="ag-body module-body notifications-body ag-page-stack">
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
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default NotificationsPage;
