import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import {
  barChartOutline,
  cardOutline,
  chatbubbleEllipsesOutline,
  closeOutline,
  gridOutline,
  menuOutline,
  sparklesOutline,
} from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { AGILITO_PATH, CHATS_PATH, PAYMENTS_PATH } from '../navigation/navConfig';

const mobileModules = [
  { path: AGILITO_PATH, icon: sparklesOutline, labelKey: 'nav.agilito' },
  { path: '/app/reports', icon: barChartOutline, labelKey: 'nav.reports' },
  { path: '/app/operations', icon: gridOutline, labelKey: 'nav.orders' },
  { path: CHATS_PATH, icon: chatbubbleEllipsesOutline, labelKey: 'nav.chats' },
  { path: PAYMENTS_PATH, icon: cardOutline, labelKey: 'nav.payments' },
] as const;

export function MobileSideNav() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('ag-mobile-nav-open', open);
    return () => document.body.classList.remove('ag-mobile-nav-open');
  }, [open]);

  const selectModule = (path: string) => {
    setOpen(false);
    go(path);
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
            <strong>{t('app.name')}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')}>
              <IonIcon icon={closeOutline} />
            </button>
          </div>
          <nav className="ag-mobile-side-nav__items">
            {mobileModules.map((item) => {
              const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
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
        </aside>
      </div>
    </>
  );
}
