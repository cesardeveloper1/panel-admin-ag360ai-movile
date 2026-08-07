import { IonIcon } from '@ionic/react';
import { logoWhatsapp, storefrontOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import {
  CHATS_PATH,
  PROFILE_PATH,
  alertsNavItem,
  isNavActive,
  ownerNavItems,
} from '../navigation/navConfig';
import { LOGO_COLOR_LOCAL } from '../constants/assets';
import { brandLabel } from '../utils/brandLabel';

export function SideNav() {
  const { t } = useTranslation();
  const { go, goRoot } = useAppNavigation();
  const location = useLocation();
  const { notifications, brand, session, startBrandSwitch } = useApp();
  const { isTablet } = useViewport();

  if (!isTablet) return null;

  const unread = notifications.filter((n) => n.unread).length;

  const onChangeBrand = () => {
    startBrandSwitch();
    window.setTimeout(() => goRoot('/welcome'), 80);
  };

  const renderItem = (item: (typeof ownerNavItems)[number]) => {
    const active = isNavActive(location.pathname, item);
    return (
      <button
        key={item.path}
        type="button"
        className={`ag-side-nav-item${active ? ' active' : ''}`}
        onClick={() => go(item.path)}
      >
        <IonIcon icon={item.icon} />
        <span>{t(item.labelKey)}</span>
      </button>
    );
  };

  return (
    <aside className="ag-side-nav" aria-label={t('nav.sidebar')}>
      <div className="ag-side-nav-brand">
        <img src={LOGO_COLOR_LOCAL} alt={t('app.name')} className="ag-side-nav-logo" />
        {brand ? <span className="ag-side-nav-brand-name">{brandLabel(brand, t)}</span> : null}
      </div>

      <nav className="ag-side-nav-items">
        {ownerNavItems.map(renderItem)}
        <button
          type="button"
          className={`ag-side-nav-item ag-side-nav-item--chats${location.pathname.startsWith(CHATS_PATH) ? ' active' : ''}`}
          onClick={() => go(CHATS_PATH)}
        >
          <IonIcon icon={logoWhatsapp} />
          <span>{t('nav.chats')}</span>
        </button>
        <button
          type="button"
          className={`ag-side-nav-item ag-side-nav-item--alerts${isNavActive(location.pathname, alertsNavItem) ? ' active' : ''}`}
          onClick={() => go(alertsNavItem.path)}
        >
          <IonIcon icon={alertsNavItem.icon} />
          <span>{t(alertsNavItem.labelKey)}</span>
          {unread > 0 ? <span className="ag-side-nav-badge">{unread}</span> : null}
        </button>
      </nav>

      <div className="ag-side-nav-footer">
        <button
          type="button"
          className="ag-side-nav-item ag-side-nav-item--brand-switch"
          onClick={onChangeBrand}
        >
          <IonIcon icon={storefrontOutline} />
          <span>{t('settings.changeBrand')}</span>
        </button>
        {session ? (
          <button
            type="button"
            className={`ag-side-nav-item${location.pathname.startsWith(PROFILE_PATH) ? ' active' : ''}`}
            onClick={() => go(PROFILE_PATH)}
          >
            <span className="ag-side-nav-avatar">{session.initials}</span>
            <span>{t('nav.profile')}</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
