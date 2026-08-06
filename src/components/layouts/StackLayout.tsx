import type { ReactNode } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { AppHeader } from '../AppHeader';
import { AppShell } from '../AppShell';
import { useModuleNav } from '../../hooks/useModuleNav';

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

  return (
    <IonPage>
      <IonContent className={contentClassName}>
        <AppShell>
          <AppHeader
            title={title}
            onBack={onBack}
            showAlerts={showAlerts}
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
