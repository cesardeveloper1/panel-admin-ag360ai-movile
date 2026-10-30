import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { peopleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../../components/layouts';
import { deliveryPartnerClient, type FleetPresence } from '../../services/deliveryPartnerClient';
import { riderPresenceKey } from './fleetTrip';

const PRESENCE_KEY = {
  onTrip: 'motorized.presenceOnTrip',
  onShift: 'motorized.presenceOnShift',
  offHours: 'motorized.presenceOffHours',
  away: 'motorized.presenceAway',
} as const;

export function RiderPresenceCard({ name, presence }: { name: string; presence?: FleetPresence | null }) {
  const { t } = useTranslation();
  const state = riderPresenceKey(presence);
  return <article className="rider-presence-card">
    <span className="rider-presence-avatar" aria-hidden="true">{name.trim().slice(0, 1).toUpperCase() || '?'}</span>
    <div className="rider-presence-copy"><h2>{name}</h2><span className={`rider-presence-state rider-presence-state--${state}`}>{t(PRESENCE_KEY[state])}</span></div>
  </article>;
}

export default function PartnerRidersPage() {
  const { t } = useTranslation();
  const [riders, setRiders] = useState<Array<{ id: string; fullName: string; presence?: FleetPresence | null }> | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError(false);
    setRiders(null);
    void deliveryPartnerClient.listRiders()
      .then((rows) => { if (active) setRiders(rows); })
      .catch(() => { if (active) { setRiders([]); setError(true); } });
    return () => { active = false; };
  }, [retry]);

  return (
    <StackLayout title={t('motorized.riders')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack fleet-list">
      {error ? <div className="rider-list-feedback" role="alert">
        <IonIcon icon={peopleOutline} aria-hidden="true" /><p>{t('motorized.ridersError')}</p>
        <button type="button" className="ag-btn" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button>
      </div> : riders === null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : riders.length === 0 ? (
        <div className="rider-list-feedback" role="status"><IonIcon icon={peopleOutline} aria-hidden="true" /><p>{t('motorized.noRiders')}</p></div>
      ) : riders.map((rider) => <RiderPresenceCard key={rider.id} name={rider.fullName} presence={rider.presence} />)}
    </StackLayout>
  );
}
