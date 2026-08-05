import React from 'react';
import { IonIcon } from '@ionic/react';
import { chevronBackOutline, notificationsOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { NOTIFICATIONS_PATH, PROFILE_PATH } from '../navigation/navConfig';
import { AgentToggle } from './AgentToggle';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  showAlerts?: boolean;
  centeredCompact?: boolean;
  profileFromAvatar?: boolean;
  backLabel?: string;
  onBack?: () => void;
  breadcrumbs?: BreadcrumbItem[];
  search?: {
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  action?: {
    label: string;
    onClick: () => void;
    icon?: string;
    iconOnly?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  avatar,
  showAlerts = false,
  centeredCompact = false,
  profileFromAvatar = true,
  backLabel,
  onBack,
  breadcrumbs = [],
  search,
  action,
  secondaryAction,
}) => {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { notifications, session } = useApp();
  const unread = notifications.filter((n) => n.unread).length;
  const isSub = Boolean(onBack);

  const openProfile = () => {
    if (profileFromAvatar && session) go(PROFILE_PATH);
  };

  const avatarNode = avatar ? (
    profileFromAvatar && session ? (
      <button
        type="button"
        className="ag-avatar ag-avatar--btn ag-header-avatar"
        onClick={openProfile}
        aria-label={t('nav.profile')}
      >
        {avatar}
      </button>
    ) : (
      <div className="ag-avatar ag-header-avatar">{avatar}</div>
    )
  ) : null;

  return (
    <header
      className={`ag-header${isSub ? ' ag-header--sub' : ''}${centeredCompact ? ' ag-header--centered-compact' : ''}`}
    >
      {!isSub && breadcrumbs.length > 0 ? (
        <div className="ag-header-nav">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      ) : null}
      <div className="ag-header-row">
        {isSub ? (
          <button
            type="button"
            className="ag-header-back ag-header-back--icon"
            onClick={onBack}
            aria-label={backLabel ?? t('common.back')}
          >
            <IonIcon icon={chevronBackOutline} className="ag-header-back-icon" />
          </button>
        ) : (
          avatarNode
        )}
        <div className="ag-header-copy">
          <h1 className="ag-header-title">{title}</h1>
          {!isSub && subtitle ? <p className="ag-header-sub">{subtitle}</p> : null}
        </div>
        <div className="ag-header-actions">
          {secondaryAction ? (
            <button
              type="button"
              className="ag-header-action ag-header-action--secondary"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          ) : null}
          {action ? (
            <button
              type="button"
              className={`ag-header-action${action.iconOnly ? ' ag-header-action--icon' : ''}`}
              onClick={action.onClick}
              aria-label={action.label}
            >
              {action.icon ? <IonIcon icon={action.icon} /> : null}
              {action.iconOnly ? null : action.label}
            </button>
          ) : null}
          {showAlerts ? (
            <>
              {!isSub ? <AgentToggle /> : null}
              <button
                type="button"
                className="ag-header-bell"
                aria-label={t('nav.alerts')}
                onClick={() => go(NOTIFICATIONS_PATH)}
              >
                <IonIcon icon={notificationsOutline} />
                {unread > 0 ? <span className="ag-header-bell-badge">{unread}</span> : null}
              </button>
            </>
          ) : null}
        </div>
      </div>
      {search ? (
        <div className="ag-search">
          <input
            type="search"
            value={search.value}
            placeholder={search.placeholder}
            onChange={(e) => search.onChange(e.target.value)}
            aria-label={search.placeholder}
          />
        </div>
      ) : null}
    </header>
  );
};
