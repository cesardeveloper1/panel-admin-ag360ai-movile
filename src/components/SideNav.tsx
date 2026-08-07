import { useEffect, useState } from 'react';
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
  isNavActive,
  ownerNavItems,
} from '../navigation/navConfig';
import { LOGO_COLOR_LOCAL } from '../constants/assets';
import { brandLabel } from '../utils/brandLabel';

const SIDEBAR_COLLAPSED_KEY = 'agiliza360.sidebar.collapsed';

function readCollapsedPreference(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved !== null ? JSON.parse(saved) === true : true;
  } catch {
    return true;
  }
}

export function SideNav() {
  const { t } = useTranslation();
  const { go, goRoot } = useAppNavigation();
  const location = useLocation();
  const { brand, session, startBrandSwitch } = useApp();
  const { isTablet } = useViewport();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed]);

  if (!isTablet) return null;

  const onChangeBrand = () => {
    startBrandSwitch();
    window.setTimeout(() => goRoot('/welcome'), 80);
  };

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const renderItem = (item: (typeof ownerNavItems)[number]) => {
    const active = isNavActive(location.pathname, item);
    return (
      <button
        key={item.path}
        type="button"
        className={`ag-side-nav-item${active ? ' active' : ''}`}
        onClick={() => go(item.path)}
      >
        <IonIcon icon={item.icon} aria-hidden="true" />
        <span>{t(item.labelKey)}</span>
      </button>
    );
  };

  return (
    <aside
      className={`ag-side-nav${collapsed ? ' is-collapsed' : ' is-expanded'}`}
      aria-label={t('nav.sidebar')}
    >
      <div className="ag-side-nav-brand">
        <button
          type="button"
          className="ag-side-nav-brand-toggle"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          <img src={LOGO_COLOR_LOCAL} alt="" className="ag-side-nav-logo" />
        </button>
        {!collapsed && brand ? (
          <span className="ag-side-nav-brand-name">{brandLabel(brand, t)}</span>
        ) : null}
      </div>

      <nav className="ag-side-nav-items">
        {ownerNavItems.map(renderItem)}
        <button
          type="button"
          className={`ag-side-nav-item ag-side-nav-item--chats${location.pathname.startsWith(CHATS_PATH) ? ' active' : ''}`}
          onClick={() => go(CHATS_PATH)}
        >
          <IonIcon icon={logoWhatsapp} aria-hidden="true" />
          <span>{t('nav.chats')}</span>
        </button>
      </nav>

      <div className="ag-side-nav-footer">
        <button
          type="button"
          className="ag-side-nav-item ag-side-nav-item--brand-switch"
          onClick={onChangeBrand}
        >
          <IonIcon icon={storefrontOutline} aria-hidden="true" />
          <span>{t('settings.changeBrand')}</span>
        </button>
        {session ? (
          <button
            type="button"
            className={`ag-side-nav-item${location.pathname.startsWith(PROFILE_PATH) ? ' active' : ''}`}
            onClick={() => go(PROFILE_PATH)}
          >
            <span className="ag-side-nav-avatar" aria-hidden="true">
              {session.initials}
            </span>
            <span>{t('nav.profile')}</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
