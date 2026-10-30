import { useEffect, useState } from 'react';
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

export default function PartnerRidersPage() {
  const { t } = useTranslation();
  const [riders, setRiders] = useState<Array<{ id: string; fullName: string; presence?: FleetPresence | null }> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    void deliveryPartnerClient.listRiders()
      .then((rows) => { if (active) setRiders(rows); })
      .catch(() => { if (active) { setRiders([]); setError(true); } });
    return () => { active = false; };
  }, []);

  return (
    <StackLayout title={t('motorized.riders')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack fleet-list">
      {riders === null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : riders.length === 0 ? (
        <p>{t('motorized.noRiders')}</p>
      ) : riders.map((rider) => (
        <article key={rider.id} className="fleet-row fleet-row--static">
          <strong>{rider.fullName}</strong>
          <span>{t(PRESENCE_KEY[riderPresenceKey(rider.presence)])}</span>
        </article>
      ))}
      {error ? <p role="alert">{t('motorized.ridersError')}</p> : null}
    </StackLayout>
  );
}
