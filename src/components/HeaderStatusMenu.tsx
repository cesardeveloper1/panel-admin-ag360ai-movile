import { useEffect, useId, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { ellipsisHorizontalOutline, notificationsOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import { NOTIFICATIONS_PATH } from '../navigation/navConfig';
import { AgentToggle } from './AgentToggle';

type HeaderStatusMenuProps = {
  /** Extra class on the trigger (e.g. agilito-top-bell sizing). */
  className?: string;
};

/**
 * Agente + Alertas:
 * - tablet+: botones en línea
 * - móvil: menú desplegable (⋯) para no saturar el header
 */
export function HeaderStatusMenu({ className = '' }: HeaderStatusMenuProps) {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { notifications } = useApp();
  const { isTablet } = useViewport();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const unread = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [isTablet]);

  if (isTablet) {
    return (
      <div className={`ag-header-status ag-header-status--inline ${className}`.trim()}>
        <AgentToggle />
        <button
          type="button"
          className="ag-header-bell"
          aria-label={t('nav.alerts')}
          onClick={() => go(NOTIFICATIONS_PATH)}
        >
          <IonIcon icon={notificationsOutline} />
          {unread > 0 ? <span className="ag-header-bell-badge">{unread}</span> : null}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`ag-header-status ag-header-status--menu${open ? ' is-open' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        className="ag-header-status__trigger"
        aria-label={t('nav.statusMenu')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <IonIcon icon={ellipsisHorizontalOutline} aria-hidden="true" />
        {unread > 0 ? <span className="ag-header-bell-badge">{unread}</span> : null}
      </button>

      {open ? (
        <div id={menuId} className="ag-header-status__panel" role="menu">
          <div className="ag-header-status__row" role="none">
            <AgentToggle />
          </div>
          <button
            type="button"
            className="ag-header-status__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              go(NOTIFICATIONS_PATH);
            }}
          >
            <IonIcon icon={notificationsOutline} aria-hidden="true" />
            <span>{t('nav.alerts')}</span>
            {unread > 0 ? <em className="ag-header-status__count">{unread}</em> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}
