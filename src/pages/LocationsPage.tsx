import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { callOutline, locationOutline, storefrontOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { useModuleNav } from '../hooks/useModuleNav';
import { apiMock } from '../services/apiMock';
import type { BranchLocation } from '../types';

const LocationsPage: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const { onBack } = useModuleNav();
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand) {
      setLocations([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    void apiMock.getLocations(brand.id).then((data) => {
      if (!alive) return;
      setLocations(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [brand?.id]);

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
        <AppHeader
          showAlerts
          title={t('locationsPage.title')}
          onBack={onBack}
        />
        <div className="ag-body module-body ag-page-stack">
          <p className="module-intro">{t('locationsPage.intro')}</p>
          <button type="button" className="brand-data-link" onClick={() => history.push('/app/datos-marca')}>
            {t('locationsPage.brandDataLink')}
          </button>

          {loading ? (
            <div className="module-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : locations.length === 0 ? (
            <p className="module-empty">{t('locationsPage.empty')}</p>
          ) : (
            <div className="location-list">
              {locations.map((loc) => (
                <article key={loc.id} className="location-card">
                  <div className="location-card__head">
                    <h3>
                      <IonIcon icon={storefrontOutline} />
                      {t(loc.nameKey)}
                    </h3>
                    <span className={`location-badge${loc.active ? '' : ' location-badge--closed'}`}>
                      {loc.active ? t('locationsPage.statusOpen') : t('locationsPage.statusClosed')}
                    </span>
                  </div>
                  <div className="location-card__meta">
                    <p>
                      <IonIcon icon={locationOutline} />
                      {t(loc.addressKey)}
                    </p>
                    <p>
                      <IonIcon icon={callOutline} />
                      {loc.phone}
                    </p>
                  </div>
                  <div className="location-card__actions">
                    <button type="button" className="ag-btn ag-btn--ghost" onClick={() => showToast('toast.comingSoon')}>
                      {t('locationsPage.edit')}
                    </button>
                    <button type="button" className="ag-btn ag-btn--ghost" onClick={() => showToast('toast.comingSoon')}>
                      {t('locationsPage.stats')}
                    </button>
                  </div>
                </article>
              ))}

              <button type="button" className="location-card location-card--add" onClick={() => showToast('toast.comingSoon')}>
                <span className="location-card__add-icon">+</span>
                {t('locationsPage.add')}
              </button>
            </div>
          )}
        </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default LocationsPage;
