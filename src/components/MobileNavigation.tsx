import { useEffect, useLayoutEffect, useState } from 'react';
import { IonContent, IonHeader, IonModal, IonToolbar, IonIcon } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { getRoute, PROFILE_PATH, OPERATIONS_PATH, CHATS_PATH, AGILITO_PATH } from '../navigation/appRouteRegistry';
import { mobileNavItems, alertsNavItem } from '../navigation/navConfig';
import { canNavigate } from '../navigation/navigationAccess';
import { brandLabel } from '../utils/brandLabel';
import { BottomNav } from './BottomNav';

/** One router-level instance: cached Ionic pages cannot leave a second menu or bar. */
export function MobileNavigation() {
  const { t } = useTranslation();
  const { session, brand, authEpoch, authRestoring, brandTransitioning, startBrandSwitch } = useApp();
  const { go, goRoot } = useAppNavigation();
  const { isTablet } = useViewport();
  const location = useLocation();
  const keyboard = useKeyboardVisible();
  const [open, setOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const eligible = Boolean(session && brand && !authRestoring && !brandTransitioning && !isTablet &&
    ['owner', 'superadmin', 'manager', 'worker'].includes(session.role) && getRoute(location.pathname)?.kind === 'tab');
  const showBar = eligible && !keyboard && !threadOpen && location.pathname !== AGILITO_PATH;
  useLayoutEffect(() => {
    const syncThread = () => {
      const openThread = document.body.classList.contains('ag-chat-thread-open');
      setThreadOpen(openThread);
      if (openThread) setOpen(false);
    };
    syncThread();
    window.addEventListener('ag:chat-thread', syncThread);
    return () => window.removeEventListener('ag:chat-thread', syncThread);
  }, []);
  useEffect(() => { setOpen(false); }, [location.pathname, location.search, authEpoch, brand?.id, isTablet]);
  useEffect(() => {
    document.body.classList.toggle('ag-primary-nav-visible', showBar);
    return () => document.body.classList.remove('ag-primary-nav-visible');
  }, [showBar]);
  const secondary = [
    ...mobileNavItems.filter(item => item.path !== OPERATIONS_PATH && item.path !== CHATS_PATH && item.path !== AGILITO_PATH),
    alertsNavItem,
  ].filter(item => canNavigate(session, item.path));
  const navigate = (path: string) => { setOpen(false); if (path !== location.pathname) go(path); };
  return <>
    {showBar ? <BottomNav onMenu={() => setOpen(true)} menuOpen={open} /> : null}
    <IonModal isOpen={eligible && open} onDidDismiss={() => setOpen(false)} className="ag-mobile-menu-modal" aria-label={t('nav.menu')}>
      <IonHeader><IonToolbar><div className="ag-mobile-menu-heading"><h2>{t('nav.menu')}</h2><button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')}><IonIcon icon={closeOutline} aria-hidden="true" /></button></div></IonToolbar></IonHeader>
      <IonContent className="ag-mobile-menu-content"><div className="ag-mobile-menu-list">
        <p>{brand ? brandLabel(brand, t) : ''}</p>
        {secondary.map(item => <button type="button" key={item.path} onClick={() => navigate(item.path)} aria-current={location.pathname === item.path ? 'page' : undefined}><IonIcon icon={item.icon} aria-hidden="true" /><span>{t(item.labelKey)}</span></button>)}
        <button type="button" onClick={() => navigate(PROFILE_PATH)}>{t('nav.profile')}</button>
        <button type="button" onClick={() => { setOpen(false); startBrandSwitch(); goRoot('/welcome', 'replace', true); }}>{t('settings.changeBrand')}</button>
      </div></IonContent>
    </IonModal>
  </>;
}
