import { useEffect, useMemo, useState } from 'react';
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
  phonePortraitOutline,
  storefrontOutline,
  languageOutline,
} from 'ionicons/icons';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { NOTIFICATIONS_PATH } from '../navigation/navConfig';
import { PAYMENT_CAPTURE_PATH } from '../navigation/appRouteRegistry';
import { brandLabel } from '../utils/brandLabel';
import { sessionDisplayName } from '../utils/sessionDisplayName';
import { userSettingsService, type SupportedAppLanguage } from '../services/userSettingsService';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { goRoot, go } = useAppNavigation();
  const { session, brand, orders, notifications, darkMode, setDarkMode, startBrandSwitch, logout, showToast } =
    useApp();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [useOwnLanguage, setUseOwnLanguage] = useState(false);
  const [language, setLanguage] = useState<SupportedAppLanguage>('es');
  const [languageBusy, setLanguageBusy] = useState(false);

  useEffect(() => {
    if (!brand?.id) return;
    let active = true;
    void userSettingsService.getLanguageSettings(brand.id)
      .then((settings) => {
        if (!active) return;
        setUseOwnLanguage(settings.useOwnConfig);
        setLanguage(settings.language);
        void i18n.changeLanguage(settings.useOwnConfig ? settings.language : (brand.language ?? 'es'));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [brand?.id, i18n]);

  const updateLanguage = async (patch: { useOwnConfig?: boolean; language?: SupportedAppLanguage }) => {
    if (!brand?.id) return;
    setLanguageBusy(true);
    try {
      const saved = await userSettingsService.updateLanguageSettings(brand.id, patch);
      setUseOwnLanguage(saved.useOwnConfig);
      setLanguage(saved.language);
      await i18n.changeLanguage(saved.useOwnConfig ? saved.language : (brand.language ?? 'es'));
      showToast('settings.languageSaved');
    } catch {
      showToast('settings.languageError');
    } finally {
      setLanguageBusy(false);
    }
  };

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
          <h2>{sessionDisplayName(session, t) || t('users.maria')}</h2>
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
        <IonItem className="settings-item">
          <IonIcon icon={languageOutline} slot="start" className="settings-icon" />
          <IonLabel>
            <h2>{t('settings.personalLanguage')}</h2>
            <p>{t('settings.personalLanguageHint')}</p>
          </IonLabel>
          <IonToggle slot="end" checked={useOwnLanguage} disabled={languageBusy} onIonChange={(event) => void updateLanguage({ useOwnConfig: event.detail.checked })} />
        </IonItem>
        {useOwnLanguage ? (
          <IonItem className="settings-item">
            <IonLabel>{t('settings.language')}</IonLabel>
            <select className="settings-language-select" value={language} disabled={languageBusy} onChange={(event) => void updateLanguage({ language: event.target.value as SupportedAppLanguage })}>
              <option value="es">{t('settings.spanish')}</option>
              <option value="en">{t('settings.english')}</option>
            </select>
          </IonItem>
        ) : null}
      </IonList>

      <p className="settings-section-label">{t('settings.account')}</p>
      <IonList className="settings-list" lines="full">
        <IonItem button className="settings-item" onClick={() => go(PAYMENT_CAPTURE_PATH)}>
          <IonIcon icon={phonePortraitOutline} slot="start" className="settings-icon" />
          <IonLabel>
            <h2>{t('paymentCapture.settingsTitle')}</h2>
            <p>{t('paymentCapture.settingsHint')}</p>
          </IonLabel>
        </IonItem>
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
