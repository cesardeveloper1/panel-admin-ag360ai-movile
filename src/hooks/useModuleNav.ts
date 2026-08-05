import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BreadcrumbItem } from '../components/Breadcrumbs';
import { AGILITO_PATH } from '../navigation/navConfig';
import { getRouteNav, isTabRoot } from '../navigation/breadcrumbs';
import { getModuleNavFrom } from '../navigation/moduleNavFrom';
import { useAppNavigation } from './useAppNavigation';

export function useModuleNav(fallbackParent = AGILITO_PATH) {
  const location = useLocation();
  const { t } = useTranslation();
  const { back } = useAppNavigation();

  const config = useMemo(() => getRouteNav(location.pathname), [location.pathname]);

  const breadcrumbs: BreadcrumbItem[] = useMemo(
    () =>
      config?.crumbs.map((crumb) => ({
        label: t(crumb.key),
        path: crumb.path,
      })) ?? [],
    [config, t],
  );

  const onBack = useCallback(() => {
    // Pop del stack Ionic; si no hay historial, ir al hub de origen (Pagos/Agilito).
    back(getModuleNavFrom(config?.parent ?? fallbackParent));
  }, [back, config?.parent, fallbackParent]);

  const showBack = !!config && !isTabRoot(location.pathname);

  return {
    breadcrumbs,
    onBack: showBack ? onBack : undefined,
    showBack,
  };
}
