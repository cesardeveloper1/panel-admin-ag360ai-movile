import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner, useIonViewWillEnter } from '@ionic/react';
import { chevronBackOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import NewBrandSheet from '../components/NewBrandSheet';
import { BRAND_KEY, PICK_BRAND_KEY, useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { apiMock } from '../services/apiMock';
import type { Brand } from '../types';
import { brandLabel } from '../utils/brandLabel';

const WelcomePage: React.FC = () => {
  const { t } = useTranslation();
  const { goRoot } = useAppNavigation();
  const { session, brand, clearBrand, selectBrandAndLoad, brandLoading, showToast, authEpoch, logout } = useApp();
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
    const data = await apiMock.getBrands();
    setBrands(data);
    return data;
  }, []);


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
  }, [session, authEpoch, goRoot, reloadBrands]);

  const handleSelect = useCallback(
    async (selected: Brand) => {
      if (selectingRef.current || brandLoading) return;

      selectingRef.current = true;
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
    if (brands.length === 1 && !localStorage.getItem(BRAND_KEY)) {
      setAwaitingAutoPick(true);
    }
    if (autoStartedRef.current || brandLoading) return;
    if (sessionStorage.getItem(PICK_BRAND_KEY) === '1') return;

    const savedId = localStorage.getItem(BRAND_KEY);
    const savedBrand = savedId ? brands.find((b) => b.id === savedId) : undefined;
    const target = savedBrand ?? (brands.length === 1 ? brands[0] : null);

    if (target) {
      autoStartedRef.current = true;
      void handleSelect(target);
    }
  }, [loading, brands, brandLoading, handleSelect]);

  const handleCreateBrand = async (values: { name: string; subdomain: string }) => {
    setCreatingBrand(true);
    try {
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

  const handleBackToLogin = () => {
    logout();
    goRoot('/login');
  };

  const busy = brandLoading || !!selectingId || creatingBrand || leaving || awaitingAutoPick;
  const activeBrand = selectingId ? brands.find((b) => b.id === selectingId) : null;
  const userName = t(session?.nameKey ?? 'users.maria');

  return (
    <IonPage>
      <IonContent className="ag-screen welcome-screen">
        <div className="welcome-layout">
          <div className="welcome-top">
            <button
              type="button"
              className="welcome-back"
              onClick={handleBackToLogin}
              aria-label={t('common.back')}
            >
              <IonIcon icon={chevronBackOutline} aria-hidden="true" />
            </button>
          </div>

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
                <h1 className="welcome-greeting">{t('auth.greeting', { name: userName })}</h1>
                <p className="welcome-subtitle">{t('welcome.subtitle')}</p>

                {loading ? (
                  <IonSpinner name="crescent" />
                ) : (
                  <div className="brand-grid brand-grid--names">
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        className={`brand-card brand-card--name${selectingId === brand.id ? ' brand-card--loading brand-card--active' : ''}`}
                        disabled={busy}
                        onClick={() => void handleSelect(brand)}
                      >
                        <span className="brand-name">{brandLabel(brand, t)}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="brand-card brand-card--new brand-card--name"
                      disabled={busy}
                      onClick={() => setNewBrandOpen(true)}
                    >
                      <span className="brand-name brand-name--new">{t('welcome.newBrand')}</span>
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
