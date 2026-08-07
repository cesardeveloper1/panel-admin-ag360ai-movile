/**
 * BottomNav desactivado temporalmente (navegación vía hamburguesa / SideNav).
 * AppShell ya no monta este componente; se conserva para reactivarlo.
 */
import { IonIcon } from '@ionic/react';
import { logoWhatsapp } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppNavigation } from '../hooks/useAppNavigation';
import {
  CHATS_PATH,
  isNavActive,
  ownerNavLeft,
  ownerNavRight,
} from '../navigation/navConfig';
import { clearChatNavFrom } from '../navigation/chatNavFrom';

function NavButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`nav-item${active ? ' active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
    >
      <IonIcon icon={icon} aria-hidden="true" />
      <span className="nav-item-label">{label}</span>
    </button>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const location = useLocation();
  const chatActive =
    location.pathname === CHATS_PATH || location.pathname.startsWith(`${CHATS_PATH}/`);

  return (
    <nav className="ag-bottom-nav" aria-label={t('nav.footer')}>
      <div className="ag-bottom-nav-inner ag-bottom-nav-inner--fab">
        {ownerNavLeft.map((item) => (
          <NavButton
            key={item.path}
            active={isNavActive(location.pathname, item)}
            label={t(item.labelKey)}
            icon={item.icon}
            onClick={() => go(item.path)}
          />
        ))}

        <div className="ag-bottom-nav-fab-slot">
          <button
            type="button"
            className={`ag-bottom-nav-fab ag-bottom-nav-fab--wa${chatActive ? ' active' : ''}`}
            onClick={() => {
              clearChatNavFrom();
              go(CHATS_PATH);
            }}
            aria-current={chatActive ? 'page' : undefined}
            aria-label={t('nav.chats')}
          >
            <IonIcon icon={logoWhatsapp} aria-hidden="true" />
          </button>
          <span className={`nav-item-label nav-item-label--fab${chatActive ? ' active' : ''}`}>
            {t('nav.chats')}
          </span>
        </div>

        {ownerNavRight.map((item) => (
          <NavButton
            key={item.path}
            active={isNavActive(location.pathname, item)}
            label={t(item.labelKey)}
            icon={item.icon}
            onClick={() => go(item.path)}
          />
        ))}
      </div>
    </nav>
  );
}
