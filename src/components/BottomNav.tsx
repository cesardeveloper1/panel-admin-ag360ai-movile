import { IonIcon } from '@ionic/react';
import { gridOutline, menuOutline, sparklesOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { PanelChatIcon } from './PanelChatIcon';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { CHATS_PATH, OPERATIONS_PATH, AGILITO_PATH } from '../navigation/navConfig';
import { requestChatsInbox } from '../navigation/chatNavFrom';
import { canNavigate } from '../navigation/navigationAccess';

export function BottomNav({ onMenu, menuOpen = false }: { onMenu: () => void; menuOpen?: boolean }) {
  const { t } = useTranslation();
  const { session } = useApp();
  const { goRoot } = useAppNavigation();
  const location = useLocation();
  const items = [
    { path: AGILITO_PATH, key: 'nav.agilito', icon: sparklesOutline },
    { path: OPERATIONS_PATH, key: 'ops.title', icon: gridOutline },
    { path: CHATS_PATH, key: 'nav.chats', icon: null },
  ];
  return <nav className="ag-primary-nav" aria-label={t('nav.footer')}>
    {items.filter(item => canNavigate(session, item.path)).map(item => <button key={item.path} type="button"
      aria-label={t(item.key)} aria-current={!menuOpen && location.pathname === item.path ? 'page' : undefined}
      onClick={() => {
        if (item.path === CHATS_PATH) requestChatsInbox();
        // Re-selecting a root never appends another Ionic page.
        if (location.pathname !== item.path || location.search) goRoot(item.path, 'replace', true);
      }}>{item.icon ? <IonIcon icon={item.icon} aria-hidden="true" /> : <PanelChatIcon />}<span>{t(item.key)}</span></button>)}
    <button type="button" aria-label={t('nav.menu')} aria-haspopup="dialog" aria-expanded={menuOpen} onClick={onMenu}>
      <IonIcon icon={menuOutline} aria-hidden="true" /><span>{t('nav.menu')}</span>
    </button>
  </nav>;
}
