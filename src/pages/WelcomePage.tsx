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
import { BRAND_KEY, PICK_BRAND_KEY, useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PROFILE_PATH } from '../navigation/appRouteRegistry';
import { apiFacade } from '../services/apiFacade';
import type { Brand } from '../types';
import { brandLabel } from '../utils/brandLabel';
import { sessionDisplayName } from '../utils/sessionDisplayName';

const WelcomePage: React.FC = () => {
  const { t } = useTranslation();
  const { goRoot, go } = useAppNavigation();
  const { session, authRestoring, brand, clearBrand, selectBrandAndLoad, brandLoading, showToast, authEpoch, logout } = useApp();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [newBrandOpen, setNewBrandOpen] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [awaitingAutoPick, setAwaitingAutoPick] = useState(() => {
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
    try {
      const data = await apiFacade.getBrands();
      setBrands(data);
      return data;
    } catch {
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
    if (authRestoring) return;
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
  }, [session, authRestoring, authEpoch, goRoot, reloadBrands]);

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
          goRoot('/app/agilito', 'replace', true);
        } else {
          showToast('toast.brandLoading');
          autoStartedRef.current = false;
        }
      } finally {
        selectingRef.current = false;
        setSelectingId(null);
      }
    },
    [brandLoading, goRoot, selectBrandAndLoad, showToast],
  );

  useEffect(() => {
    if (loading || brands.length === 0) return;
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
      return;
    }

    setAwaitingAutoPick(true);
    autoStartedRef.current = true;
    void handleSelect(savedBrand);
  }, [loading, brands, brandLoading, handleSelect]);

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

  return (
    <IonPage>
      <IonContent className="ag-screen welcome-screen">
        <div className="welcome-layout">
          <div className="ag-body welcome-body">
            {busy ? (
              <div className="welcome-loading">
                <IonSpinner name="crescent" />
                <p>
                  {t('welcome.loadingBrand', {
                    brand: activeBrand
                      ? brandLabel(activeBrand, t)
                      : brandLabel(brands[0], t) || t('brands.pacifico'),
                  })}
                </p>
              </div>
            ) : (
              <>
                <header className="welcome-hero">
                  <h1 className="welcome-greeting">
                    {t('welcome.hello', { name: userName })}
                  </h1>
                  <p className="welcome-subtitle">{t('welcome.subtitle')}</p>

                  <div className="welcome-actions">
                    <button
                      type="button"
                      className="welcome-action-btn"
                      onClick={() => go(PROFILE_PATH)}
                    >
                      <IonIcon icon={personOutline} aria-hidden="true" />
                      {t('nav.profile')}
                    </button>
                    <button
                      type="button"
                      className="welcome-action-btn welcome-action-btn--logout"
                      onClick={handleLogout}
                    >
                      <IonIcon icon={logOutOutline} aria-hidden="true" />
                      {t('auth.logout')}
                    </button>
                  </div>
                </header>

                {loading ? (
                  <div className="welcome-loading welcome-loading--inline">
                    <IonSpinner name="crescent" />
                  </div>
                ) : (
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
                  </div>
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
