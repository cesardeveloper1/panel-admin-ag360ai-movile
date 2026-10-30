import { useEffect, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { callOutline, createOutline, locationOutline, storefrontOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import NewLocationSheet from '../components/NewLocationSheet';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { apiFacade } from '../services/apiFacade';
import type { LocationFormInput } from '../services/locationService';
import type { BranchLocation } from '../types';

function locationName(location: BranchLocation, t: (key: string) => string): string {
  return location.name ?? (location.nameKey ? t(location.nameKey) : 'Local sin nombre');
}

function locationAddress(location: BranchLocation, t: (key: string) => string): string {
  return location.address ?? (location.addressKey ? t(location.addressKey) : 'Dirección no registrada');
}

const LocationsPage: React.FC = () => {
  const { go } = useAppNavigation();
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const brandId = brand?.id;
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<BranchLocation | null>(null);

  useEffect(() => {
    if (!brandId) {
      setLocations([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setLoadError(false);
    void apiFacade.getLocations(brandId)
      .then((data) => {
        if (alive) setLocations(data);
      })
      .catch(() => {
        if (alive) { setLoadError(true); showToast('toast.locationLoadError'); }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [brandId, showToast, retry]);

  const handleCreateLocation = async (input: LocationFormInput) => {
    if (!brandId) return;
    setIsCreating(true);
    try {
      const created = await apiFacade.createLocation({ ...input, brandId });
      setLocations((previous) => [created, ...previous]);
      setIsCreateOpen(false);
      showToast('toast.locationCreated');
    } catch {
      showToast('toast.locationCreateError');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateLocation = async (input: LocationFormInput) => {
    if (!brandId || !locationToEdit) return;
    setIsCreating(true);
    try {
      const updated = await apiFacade.updateLocation({ ...input, brandId, id: locationToEdit.id });
      setLocations((previous) => previous.map((location) => location.id === updated.id ? updated : location));
      setLocationToEdit(null);
      showToast('toast.locationUpdated');
    } catch {
      showToast('toast.locationUpdateError');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <StackLayout title={t('locationsPage.title')} showAlerts>
      <p className="module-intro">{t('locationsPage.intro')}</p>
      <button type="button" className="brand-data-link" onClick={() => go('/app/datos-marca')}>
        {t('locationsPage.brandDataLink')}
      </button>

      {loadError ? (
        <div className="clients-empty-state" role="alert">
          <IonIcon icon={storefrontOutline} aria-hidden="true" />
          <p>{t('toast.locationLoadError')}</p>
          <button type="button" className="ag-btn" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button>
        </div>
      ) : loading ? (
        <div className="module-loading" role="status" aria-label={t('app.loading')}><IonSpinner name="crescent" /></div>
      ) : locations.length === 0 ? (
        <div className="clients-empty-state" role="status">
          <IonIcon icon={storefrontOutline} aria-hidden="true" />
          <p>{t('locationsPage.empty')}</p>
        </div>
      ) : (
        <div className="location-list">
          {locations.map((loc) => (
            <article key={loc.id} className="location-card">
              <div className="location-card__head">
                <h3><IonIcon icon={storefrontOutline} aria-hidden="true" /><span>{locationName(loc, t)}</span></h3>
                <div className="location-card__header-actions">
                  <span className={`location-badge${loc.active ? '' : ' location-badge--closed'}`}>
                    {loc.active ? t('locationsPage.statusOpen') : t('locationsPage.statusClosed')}
                  </span>
                  <button
                    type="button"
                    className="location-card__edit"
                    aria-label={`${t('locationsPage.edit')}: ${locationName(loc, t)}`}
                    onClick={() => setLocationToEdit({
                      ...loc,
                      name: locationName(loc, t),
                      address: locationAddress(loc, t),
                    })}
                  >
                    <IonIcon icon={createOutline} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="location-card__meta">
                <p><IonIcon icon={locationOutline} aria-hidden="true" />{locationAddress(loc, t)}</p>
                <p><IonIcon icon={callOutline} aria-hidden="true" />{loc.phone || '—'}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <button type="button" className="module-fab module-fab--location" onClick={() => setIsCreateOpen(true)}>
        + {t('locationsPage.add')}
      </button>
      <NewLocationSheet
        open={isCreateOpen}
        busy={isCreating}
        onDismiss={() => !isCreating && setIsCreateOpen(false)}
        onSubmit={handleCreateLocation}
      />
      <NewLocationSheet
        open={Boolean(locationToEdit)}
        busy={isCreating}
        location={locationToEdit}
        onDismiss={() => !isCreating && setLocationToEdit(null)}
        onSubmit={handleUpdateLocation}
      />
    </StackLayout>
  );
};

export default LocationsPage;
