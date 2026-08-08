import { useEffect, useLayoutEffect, useRef } from 'react';
import { BRAND_KEY, PICK_BRAND_KEY, useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { apiFacade } from '../services/apiFacade';
import { BrandBootShell } from './BrandBootShell';

interface RequireBrandProps {
  children: React.ReactNode;
}

export const RequireBrand: React.FC<RequireBrandProps> = ({ children }) => {
  const { goRoot } = useAppNavigation();
  const { session, brand, brandLoading, selectBrandAndLoad, authEpoch } = useApp();
  const pendingBrand = typeof localStorage !== 'undefined' ? localStorage.getItem(BRAND_KEY) : null;
  const manualPick = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PICK_BRAND_KEY) === '1';
  const hydratingRef = useRef(false);

  useEffect(() => {
    hydratingRef.current = false;
  }, [session?.email, authEpoch]);

  useEffect(() => {
    if (!session) {
      goRoot('/login');
      return;
    }
    if (!brand && !brandLoading && !pendingBrand) {
      goRoot('/welcome');
    }
  }, [session, brand, brandLoading, pendingBrand, goRoot]);

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

  if (!session) {
    return null;
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
  const Wrapped: React.FC = () => (
    <RequireBrand>
      <Page />
    </RequireBrand>
  );
  Wrapped.displayName = `Branded(${Page.displayName ?? Page.name ?? 'Page'})`;
  return Wrapped;
}
