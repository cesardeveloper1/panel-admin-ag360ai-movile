import { useRef, type ReactNode } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { AppHeader } from '../AppHeader';
import { AppShell } from '../AppShell';
import { normalizePath } from '../../navigation/appRouteRegistry';

type HeaderSearch = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

type HeaderAction = {
  label: string;
  onClick: () => void;
  icon?: string;
  iconOnly?: boolean;
};

export interface TabLayoutProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  showAlerts?: boolean;
  centeredCompact?: boolean;
  profileFromAvatar?: boolean;
  search?: HeaderSearch;
  action?: HeaderAction;
  secondaryAction?: HeaderAction;
  children: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
  /** Extra nodes inside IonPage (e.g. IonModal) */
  pageExtras?: ReactNode;
}

/**
 * Chrome para tabs raíz (Reportes, Pagos, …):
 * header compacto centrado por defecto; sin back.
 */
export function TabLayout({
  title,
  subtitle,
  avatar,
  showAlerts = false,
  centeredCompact = true,
  profileFromAvatar,
  search,
  action,
  secondaryAction,
  children,
  contentClassName = 'ag-screen',
  bodyClassName = 'ag-body module-body ag-page-stack',
  pageExtras,
}: TabLayoutProps) {
  const routePath = useRef(
    normalizePath(typeof window !== 'undefined' ? window.location.pathname : ''),
  ).current;

  return (
    <IonPage data-ag-route={routePath}>
      <IonContent className={contentClassName}>
        <AppShell>
          <AppHeader
            title={title}
            subtitle={subtitle}
            avatar={avatar}
            showAlerts={showAlerts}
            centeredCompact={centeredCompact}
            profileFromAvatar={profileFromAvatar}
            search={search}
            action={action}
            secondaryAction={secondaryAction}
          />
          <div className={bodyClassName}>{children}</div>
        </AppShell>
      </IonContent>
      {pageExtras}
    </IonPage>
  );
}
