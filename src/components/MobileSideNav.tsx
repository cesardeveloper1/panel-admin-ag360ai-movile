import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { closeOutline, menuOutline, storefrontOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PROFILE_PATH, isNavActive, mobileNavItems, CHATS_PATH } from '../navigation/navConfig';
import { requestChatsInbox } from '../navigation/chatNavFrom';
import { LOGO_COLOR_LOCAL } from '../constants/assets';
import { brandLabel } from '../utils/brandLabel';

export function MobileSideNav() {
  const { t } = useTranslation();
  const { go, goRoot } = useAppNavigation();
  const { brand, session, startBrandSwitch } = useApp();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('ag-mobile-nav-open', open);
    return () => document.body.classList.remove('ag-mobile-nav-open');
  }, [open]);

  const selectModule = (path: string) => {
    setOpen(false);
    if (path === CHATS_PATH || path.startsWith(`${CHATS_PATH}?`)) {
      requestChatsInbox();
      goRoot(CHATS_PATH, 'replace', true);
      return;
    }
    go(path);
  };

  const onChangeBrand = () => {
    setOpen(false);
    startBrandSwitch();
    window.setTimeout(() => goRoot('/welcome'), 80);
  };

  return (
    <>
      <button
        type="button"
        className="ag-mobile-menu-trigger"
        onClick={() => setOpen(true)}
        aria-label={t('nav.sidebar')}
        aria-expanded={open}
        aria-controls="mobile-module-nav"
      >
        <IonIcon icon={menuOutline} />
      </button>

      <div className={`ag-mobile-nav-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <button
          type="button"
          className="ag-mobile-nav-backdrop"
          onClick={() => setOpen(false)}
          aria-label={t('common.close')}
          tabIndex={open ? 0 : -1}
        />
        <aside id="mobile-module-nav" className="ag-mobile-side-nav" aria-label={t('nav.sidebar')}>
          <div className="ag-mobile-side-nav__head">
            <div className="ag-mobile-side-nav__brand">
              <img src={LOGO_COLOR_LOCAL} alt={t('app.name')} className="ag-mobile-side-nav__logo" />
              {brand ? (
                <span className="ag-mobile-side-nav__brand-name">{brandLabel(brand, t)}</span>
              ) : (
                <strong>{t('app.name')}</strong>
              )}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>
          <nav className="ag-mobile-side-nav__items">
            {mobileNavItems.map((item) => {
              const active = isNavActive(location.pathname, item);
              return (
                <button
                  key={item.path}
                  type="button"
                  className={`ag-mobile-side-nav__item${active ? ' active' : ''}`}
                  onClick={() => selectModule(item.path)}
                  aria-current={active ? 'page' : undefined}
                  tabIndex={open ? 0 : -1}
                >
                  <IonIcon icon={item.icon} />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
          <div className="ag-mobile-side-nav__footer">
            <button
              type="button"
              className="ag-mobile-side-nav__item ag-mobile-side-nav__brand-switch"
              onClick={onChangeBrand}
              tabIndex={open ? 0 : -1}
            >
              <IonIcon icon={storefrontOutline} />
              <span>{t('settings.changeBrand')}</span>
            </button>
            {session ? (
              <button
                type="button"
                className={`ag-mobile-side-nav__profile${location.pathname.startsWith(PROFILE_PATH) ? ' active' : ''}`}
                onClick={() => selectModule(PROFILE_PATH)}
                aria-current={location.pathname.startsWith(PROFILE_PATH) ? 'page' : undefined}
                tabIndex={open ? 0 : -1}
              >
                <span className="ag-mobile-side-nav__avatar">{session.initials}</span>
                <span>{t('nav.profile')}</span>
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
