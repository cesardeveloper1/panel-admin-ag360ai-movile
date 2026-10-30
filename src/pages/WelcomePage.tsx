import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner, useIonViewWillEnter } from '@ionic/react';
import {
  chevronForwardOutline,
  logOutOutline,
  personOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import NewBrandSheet from '../components/NewBrandSheet';
import { BRAND_KEY, PICK_BRAND_KEY } from '../context/AppContext';
import { useApp } from '../hooks/useApp';
import { isTabRootPath } from '../navigation/appRouteRegistry';
import { navigationLandingPath } from '../navigation/navigationAccess';
import { isStaffRole } from '../navigation/staffScreens';
import { isFleetPhoneRole } from '../navigation/motorizedScreens';
import { PLATFORM_PATH } from '../navigation/platformScreens';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PROFILE_PATH } from '../navigation/appRouteRegistry';
import { apiFacade } from '../services/apiFacade';
import type { Brand } from '../types';
import { brandLabel } from '../utils/brandLabel';
import { sessionDisplayName } from '../utils/sessionDisplayName';
import { useLocation } from 'react-router-dom';
import { LOGO_WORDMARK_COLOR_LOCAL, LOGO_WHITE_LOCAL } from '../constants/assets';

const WelcomePage: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const onWelcome = pathname === '/welcome';
  const { goRoot, go, replace } = useAppNavigation();
  const { session, authRestoring, brand, clearBrand, selectBrandAndLoad, brandLoading, showToast, authEpoch, logout } = useApp();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const staff = isStaffRole(session?.role);
  const fleetPhone = isFleetPhoneRole(session?.role);
  const resumeSavedBrand = session?.role === 'superadmin'
    && typeof localStorage !== 'undefined'
    && Boolean(localStorage.getItem(BRAND_KEY))
    && (typeof sessionStorage === 'undefined' || sessionStorage.getItem(PICK_BRAND_KEY) !== '1');
  useLayoutEffect(() => {
    if (!onWelcome || !fleetPhone) return;
    const landing = navigationLandingPath(session);
    if (isTabRootPath(landing)) goRoot(landing, 'replace', true);
    else replace(landing);
  }, [onWelcome, fleetPhone, session, goRoot, replace]);
  useLayoutEffect(() => {
    if (!onWelcome || session?.role !== 'superadmin' || resumeSavedBrand) return;
    sessionStorage.removeItem(PICK_BRAND_KEY);
    goRoot(PLATFORM_PATH, 'replace', true);
  }, [onWelcome, session?.role, resumeSavedBrand, goRoot]);
  const [awaitingAutoPick, setAwaitingAutoPick] = useState(() => {
    if (isStaffRole(session?.role)) return true;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(PICK_BRAND_KEY) === '1') {
      return false;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(BRAND_KEY)) {
      return true;
    }
    return false;
  });
  const selectingRef = useRef(false);
  const autoStartedRef = useRef(false);

  useIonViewWillEnter(() => {
    if (sessionStorage.getItem(PICK_BRAND_KEY) !== '1') return;
    autoStartedRef.current = false;
    selectingRef.current = false;
    setSelectingId(null);
    setLeaving(false);
    setAwaitingAutoPick(false);
    if (brand) clearBrand();
  });

  const reloadBrands = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await apiFacade.getBrands();
      setBrands(data);
      return data;
    } catch {
      setLoadError(true);
      setAwaitingAutoPick(false);
      showToast('toast.brandsLoadError');
      setBrands([]);
      return [] as Brand[];
    }
  }, [showToast]);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(PICK_BRAND_KEY) !== '1' || !brand) return;
    clearBrand();
  }, [brand, clearBrand]);

  useEffect(() => {
    selectingRef.current = false;
    autoStartedRef.current = false;
    setSelectingId(null);
  }, [session?.email, authEpoch]);

  useEffect(() => {
    if (!onWelcome || authRestoring || fleetPhone) return;
    if (!session) {
      goRoot('/login');
      return;
    }
    let alive = true;
    setLoading(true);
    setBrands([]);
    void reloadBrands().finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [onWelcome, fleetPhone, session, authRestoring, authEpoch, goRoot, reloadBrands]);

  const handleSelect = useCallback(
    async (selected: Brand) => {
      if (selectingRef.current || brandLoading) return;

      selectingRef.current = true;
      autoStartedRef.current = true;
      setSelectingId(selected.id);

      try {
        const ok = await selectBrandAndLoad(selected);
        if (ok) {
          setLeaving(true);
          goRoot(navigationLandingPath(session), 'replace', true);
        } else {
          showToast('toast.brandLoading');
          autoStartedRef.current = false;
        }
      } finally {
        selectingRef.current = false;
        setSelectingId(null);
      }
    },
    [brandLoading, goRoot, selectBrandAndLoad, session, showToast],
  );

  useEffect(() => {
    if (!onWelcome || fleetPhone || loading) return;
    if (staff) {
      if (brands.length === 0) {
        setAwaitingAutoPick(false);
        return;
      }
      if (autoStartedRef.current || brandLoading) return;
      const savedId = localStorage.getItem(BRAND_KEY);
      const savedBrand = savedId ? brands.find((item) => item.id === savedId) : undefined;
      setAwaitingAutoPick(true);
      autoStartedRef.current = true;
      void handleSelect(savedBrand ?? brands[0]);
      return;
    }
    if (brands.length === 0) {
      if (session?.role === 'superadmin') goRoot(PLATFORM_PATH, 'replace', true);
      return;
    }
    if (sessionStorage.getItem(PICK_BRAND_KEY) === '1') {
      setAwaitingAutoPick(false);
      return;
    }
    if (autoStartedRef.current || brandLoading) return;

    // Solo reanudar marca ya guardada en esta sesión (p. ej. refresh).
    // Una sola marca NO se elige sola: el usuario debe tocar la tarjeta.
    const savedId = localStorage.getItem(BRAND_KEY);
    const savedBrand = savedId ? brands.find((b) => b.id === savedId) : undefined;
    if (!savedBrand) {
      setAwaitingAutoPick(false);
      if (session?.role === 'superadmin') goRoot(PLATFORM_PATH, 'replace', true);
      return;
    }

    setAwaitingAutoPick(true);
    autoStartedRef.current = true;
    void handleSelect(savedBrand);
  }, [onWelcome, fleetPhone, loading, brands, brandLoading, handleSelect, staff, session?.role, goRoot]);

  const handleCreateBrand = async (values: { name: string; subdomain: string }) => {
    if (!apiFacade.useMock) {
      showToast('toast.comingSoon');
      return;
    }
    setCreatingBrand(true);
    try {
      const { apiMock } = await import('../services/apiMock');
      const created = await apiMock.createBrand(values);
      if (!created) {
        showToast('welcome.newBrandExists');
        return;
      }
      setNewBrandOpen(false);
      await reloadBrands();
      showToast('welcome.newBrandOk');
      await handleSelect(created);
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleLogout = () => {
    logout();
    goRoot('/login');
  };

  const busy = brandLoading || !!selectingId || creatingBrand || leaving || awaitingAutoPick;
  const activeBrand = selectingId ? brands.find((b) => b.id === selectingId) : null;
  const userName = sessionDisplayName(session, t);

  const locationLabel = (count: number) =>
    t(count === 1 ? 'welcome.locationOne' : 'welcome.locationMany', { count });

  if (fleetPhone || (session?.role === 'superadmin' && !resumeSavedBrand)) {
    return (
      <IonPage>
        <IonContent className="ag-screen">
          <div className="welcome-loading"><IonSpinner name="crescent" /></div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ag-screen welcome-screen">
        <div className="welcome-layout">
          <div className="ag-body welcome-body">
            {busy ? (
              <div className="welcome-loading">
                <IonSpinner name="crescent" />
                <p>
                  {activeBrand || brands[0] ? t('welcome.loadingBrand', {
                    brand: brandLabel(activeBrand ?? brands[0], t),
                  }) : t('app.loading')}
                </p>
              </div>
            ) : (
              <>
                <header className="welcome-hero">
                  <div className="welcome-toolbar">
                  <img className="welcome-logo welcome-logo--light" src={LOGO_WORDMARK_COLOR_LOCAL} alt={t('app.name')} />
                  <img className="welcome-logo welcome-logo--dark" src={LOGO_WHITE_LOCAL} alt={t('app.name')} />
                  <div className="welcome-actions">
                    <button
                      type="button"
                      className="welcome-action-btn"
                      aria-label={t('nav.profile')}
                      title={t('nav.profile')}
                      onClick={() => go(PROFILE_PATH)}
                    >
                      <IonIcon icon={personOutline} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="welcome-action-btn welcome-action-btn--logout"
                      aria-label={t('auth.logout')}
                      title={t('auth.logout')}
                      onClick={handleLogout}
                    >
                      <IonIcon icon={logOutOutline} aria-hidden="true" />
                    </button>
                  </div>
                  </div>
                  <h1 className="welcome-greeting">
                    {t('welcome.hello', { name: userName })}
                  </h1>
                  <p className="welcome-subtitle">{staff ? t('welcome.staffSubtitle') : t('welcome.subtitle')}</p>
                </header>

                {loading ? (
                  <div className="welcome-loading welcome-loading--inline" role="status" aria-label={t('app.loading')}>
                    <IonSpinner name="crescent" />
                  </div>
                ) : loadError ? (
                  <div className="welcome-feedback" role="alert">
                    <IonIcon icon={storefrontOutline} aria-hidden="true" />
                    <h2>{t('welcome.loadError')}</h2>
                    <p>{t('welcome.loadErrorHint')}</p>
                    <button type="button" className="ag-btn" onClick={() => {
                      setLoading(true);
                      void reloadBrands().finally(() => setLoading(false));
                    }}>{t('welcome.retry')}</button>
                  </div>
                ) : (
                  <>
                  <h2 className="welcome-section-title">{t('welcome.title')}</h2>
                  {brands.length === 0 ? (
                    <div className="welcome-feedback" role="status">
                      <IonIcon icon={storefrontOutline} aria-hidden="true" />
                      <p>{t(staff ? 'staff.noBrand' : 'welcome.noBrands')}</p>
                    </div>
                  ) : null}
                  <div className="brand-grid brand-grid--welcome">
                    {brands.map((item) => {
                      const name = brandLabel(item, t);
                      const hasLogo = Boolean(item.logoUrl?.trim());
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`brand-card brand-card--welcome${selectingId === item.id ? ' brand-card--loading brand-card--active' : ''}`}
                          disabled={busy}
                          onClick={() => void handleSelect(item)}
                        >
                          <div className={`brand-card__media${hasLogo ? '' : ' brand-card__media--fallback'}`}>
                            {hasLogo ? (
                              <img src={item.logoUrl} alt="" />
                            ) : (
                              <IonIcon icon={storefrontOutline} aria-hidden="true" />
                            )}
                          </div>
                          <div className="brand-card__copy">
                            <strong className="brand-name">{name}</strong>
                            <span className="brand-meta">
                              <IonIcon icon={storefrontOutline} aria-hidden="true" />
                              {locationLabel(item.locations)}
                            </span>
                          </div>
                          <IonIcon
                            icon={chevronForwardOutline}
                            className="brand-card__chevron"
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}

                    {!staff ? (
                    <button
                      type="button"
                      className="brand-card brand-card--create"
                      disabled={busy}
                      onClick={() => setNewBrandOpen(true)}
                    >
                      <span className="brand-card__add-icon" aria-hidden="true">+</span>
                      <strong>{t('welcome.createBrand')}</strong>
                      <small>{t('welcome.createBrandHint')}</small>
                    </button>
                    ) : null}
                  </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <NewBrandSheet
          open={newBrandOpen}
          busy={creatingBrand}
          onDismiss={() => setNewBrandOpen(false)}
          onSubmit={handleCreateBrand}
        />
      </IonContent>
    </IonPage>
  );
};

export default WelcomePage;
