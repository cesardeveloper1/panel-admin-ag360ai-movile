import { useRef, type ReactNode } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { AppHeader } from '../AppHeader';
import { AppShell } from '../AppShell';
import { useModuleNav } from '../../hooks/useModuleNav';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import {
  isBusinessModulePath,
  normalizePath,
  NOTIFICATIONS_PATH,
} from '../../navigation/appRouteRegistry';

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

export interface StackLayoutProps {
  title: string;
  showAlerts?: boolean;
  /** Si false, oculta la flecha de atrás (p. ej. Configuración). Default true. */
  showBack?: boolean;
  profileFromAvatar?: boolean;
  search?: HeaderSearch;
  action?: HeaderAction;
  secondaryAction?: HeaderAction;
  children: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
  /** Extra nodes inside IonPage (e.g. IonAlert) */
  pageExtras?: ReactNode;
}

/**
 * Chrome para pantallas stack (módulos, settings, notificaciones):
 * back icon + título + campana; sin breadcrumbs ni subtítulo.
 */
export function StackLayout({
  title,
  showAlerts = true,
  showBack = true,
  profileFromAvatar,
  search,
  action,
  secondaryAction,
  children,
  contentClassName = 'ag-screen',
  bodyClassName = 'ag-body module-body ag-page-stack',
  pageExtras,
}: StackLayoutProps) {
  const { onBack } = useModuleNav();
  const { back } = useAppNavigation();
  const routePath = useRef(
    normalizePath(typeof window !== 'undefined' ? window.location.pathname : ''),
  ).current;
  const isBusinessModule = useRef(isBusinessModulePath(routePath)).current;
  const isNotifications =
    routePath === NOTIFICATIONS_PATH || routePath.startsWith(`${NOTIFICATIONS_PATH}/`);
  const hideMobileMenu = isBusinessModule || isNotifications;
  const alertsVisible = isBusinessModule ? false : showAlerts;

  /** Alertas: pop al origen real (sin forzar hub Agilito/Pagos). */
  const handleBack = isNotifications ? () => back() : onBack;

  return (
    <IonPage data-ag-route={routePath}>
      <IonContent className={contentClassName}>
        <AppShell hideMobileMenu={hideMobileMenu}>
          <AppHeader
            title={title}
            onBack={showBack ? handleBack : undefined}
            showAlerts={alertsVisible}
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
