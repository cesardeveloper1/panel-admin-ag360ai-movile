import { useMemo, useState } from 'react';
import {
  IonAlert,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToggle,
} from '@ionic/react';
import {
  logOutOutline,
  moonOutline,
  swapHorizontalOutline,
  notificationsOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { useApp } from '../context/AppContext';
import { NOTIFICATIONS_PATH } from '../navigation/navConfig';
import { brandLabel } from '../utils/brandLabel';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { goRoot, go } = useAppNavigation();
  const { session, brand, orders, notifications, darkMode, setDarkMode, startBrandSwitch, logout } =
    useApp();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const unread = notifications.filter((n) => n.unread).length;
  const activeOrders = useMemo(
    () => orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
    [orders],
  );

  const onChangeBrand = () => {
    startBrandSwitch();
    window.setTimeout(() => goRoot('/welcome'), 80);
  };

  const onLogout = () => {
    logout();
    goRoot('/login');
  };

  return (
    <StackLayout
      title={t('settings.title')}
      showAlerts
      showBack={false}
      bodyClassName="ag-body settings-body"
      pageExtras={
        <IonAlert
          isOpen={logoutOpen}
          header={t('settings.logoutConfirmTitle')}
          message={t('settings.logoutConfirmMessage')}
          buttons={[
            { text: t('settings.logoutConfirmCancel'), role: 'cancel', handler: () => setLogoutOpen(false) },
            { text: t('settings.logoutConfirmOk'), role: 'destructive', handler: onLogout },
          ]}
          onDidDismiss={() => setLogoutOpen(false)}
        />
      }
    >
      <section className="profile-hero ag-enter">
        <div className="profile-hero-avatar">{session?.initials ?? '?'}</div>
        <div className="profile-hero-copy">
          <h2>{t(session?.nameKey ?? 'users.maria')}</h2>
          <p>{session?.email}</p>
          {brand ? (
            <span className="profile-hero-brand">
              <IonIcon icon={storefrontOutline} />
              {brandLabel(brand, t)}
            </span>
          ) : null}
        </div>
      </section>

      <div className="profile-stats ag-enter">
        <button type="button" className="profile-stat" onClick={() => go('/app/operations')}>
          <strong>{activeOrders}</strong>
          <span>{t('profile.activeOrders')}</span>
        </button>
        <button type="button" className="profile-stat" onClick={() => go(NOTIFICATIONS_PATH)}>
          <strong>{unread}</strong>
          <span>{t('profile.unreadAlerts')}</span>
        </button>
        <button type="button" className="profile-stat" onClick={() => go('/app/payments')}>
          <strong>{brand?.locations ?? 0}</strong>
          <span>{t('profile.locations')}</span>
        </button>
      </div>

      <p className="settings-section-label">{t('settings.appearance')}</p>
      <IonList className="settings-list" lines="none">
        <IonItem className="settings-item">
          <IonIcon icon={moonOutline} slot="start" className="settings-icon" />
          <IonLabel>
            <h2>{t('settings.darkMode')}</h2>
            <p>{t('settings.darkModeHint')}</p>
          </IonLabel>
          <IonToggle slot="end" checked={darkMode} onIonChange={(e) => setDarkMode(e.detail.checked)} />
        </IonItem>
      </IonList>

      <p className="settings-section-label">{t('settings.account')}</p>
      <IonList className="settings-list" lines="full">
        <IonItem button className="settings-item" onClick={() => go(NOTIFICATIONS_PATH)}>
          <IonIcon icon={notificationsOutline} slot="start" className="settings-icon" />
          <IonLabel>
            <h2>{t('nav.alerts')}</h2>
            <p>{unread > 0 ? t('profile.unreadCount', { count: unread }) : t('notifications.empty')}</p>
          </IonLabel>
        </IonItem>
        <IonItem button className="settings-item" onClick={onChangeBrand}>
          <IonIcon icon={swapHorizontalOutline} slot="start" className="settings-icon" />
          <IonLabel>
            <h2>{t('settings.changeBrand')}</h2>
            <p>{t('settings.changeBrandHint')}</p>
          </IonLabel>
        </IonItem>
        <IonItem button className="settings-item settings-item--danger" onClick={() => setLogoutOpen(true)}>
          <IonIcon icon={logOutOutline} slot="start" className="settings-icon settings-icon--danger" />
          <IonLabel color="danger">{t('settings.logout')}</IonLabel>
        </IonItem>
      </IonList>
    </StackLayout>
  );
};

export default SettingsPage;
