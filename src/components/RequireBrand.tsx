import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND_KEY, PICK_BRAND_KEY } from '../context/AppContext';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { normalizePath, OPERATIONS_PATH } from '../navigation/appRouteRegistry';
import { canNavigate } from '../navigation/navigationAccess';
import { TRIP_PATH, isFleetPhoneRole, isMotorizedRole, isRiderRole } from '../navigation/motorizedScreens';
import { isPlatformPath, PLATFORM_PATH } from '../navigation/platformScreens';
import { apiFacade } from '../services/apiFacade';
import { BrandBootShell } from './BrandBootShell';

interface RequireBrandProps {
  children: React.ReactNode;
}

export const RequireBrand: React.FC<RequireBrandProps> = ({ children }) => {
  const { goRoot } = useAppNavigation();
  const { pathname } = useLocation();
  const onPlatform = isPlatformPath(normalizePath(pathname));
  const { session, authRestoring, brand, brandLoading, selectBrandAndLoad, authEpoch } = useApp();
  const pendingBrand = typeof localStorage !== 'undefined' ? localStorage.getItem(BRAND_KEY) : null;
  const manualPick = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PICK_BRAND_KEY) === '1';
  const hydratingRef = useRef(false);

  useEffect(() => {
    hydratingRef.current = false;
  }, [session?.email, authEpoch]);

  useEffect(() => {
    if (!authRestoring && !session) {
      goRoot('/login');
      return;
    }
    if (isMotorizedRole(session?.role) && !canNavigate(session, pathname)) {
      goRoot(OPERATIONS_PATH);
      return;
    }
    if (isRiderRole(session?.role) && !canNavigate(session, pathname)) {
      goRoot(TRIP_PATH);
      return;
    }
    if (isFleetPhoneRole(session?.role) || brand || brandLoading || pendingBrand) return;
    if (session?.role === 'superadmin') {
      if (!onPlatform) goRoot(PLATFORM_PATH);
      return;
    }
    goRoot('/welcome');
  }, [session, authRestoring, brand, brandLoading, pendingBrand, onPlatform, goRoot, pathname]);

  useLayoutEffect(() => {
    if (!session || brand || brandLoading || !pendingBrand || manualPick || hydratingRef.current) return;

    hydratingRef.current = true;
    void (async () => {
      try {
        const brands = await apiFacade.getBrands();
        const found = brands.find((b) => b.id === pendingBrand);
        if (found) {
          const ok = await selectBrandAndLoad(found);
          if (!ok) {
            localStorage.removeItem(BRAND_KEY);
            goRoot('/welcome');
          }
        } else {
          localStorage.removeItem(BRAND_KEY);
          goRoot('/welcome');
        }
      } finally {
        hydratingRef.current = false;
      }
    })();
  }, [session, brand, brandLoading, pendingBrand, manualPick, selectBrandAndLoad, goRoot, authEpoch]);

  if (authRestoring) {
    return <BrandBootShell />;
  }

  if (!session) {
    return null;
  }

  if (isMotorizedRole(session.role)) {
    if (!canNavigate(session, pathname)) return null;
    return <>{children}</>;
  }

  if (isRiderRole(session.role)) {
    if (!canNavigate(session, pathname)) return null;
    return <>{children}</>;
  }

  if (isFleetPhoneRole(session.role) || (session.role === 'superadmin' && onPlatform)) {
    return <>{children}</>;
  }

  if (brand) {
    return <>{children}</>;
  }

  if (brandLoading || (pendingBrand && !manualPick)) {
    return <BrandBootShell />;
  }

  return <BrandBootShell />;
};

export function branded(Page: React.ComponentType): React.FC {
  const Wrapped: React.FC = () => {
    const { authEpoch, brand } = useApp();
    return <RequireBrand><Page key={`${authEpoch}|${brand?.id ?? ''}`} /></RequireBrand>;
  };
  Wrapped.displayName = `Branded(${Page.displayName ?? Page.name ?? 'Page'})`;
  return Wrapped;
}
