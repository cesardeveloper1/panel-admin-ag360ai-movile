import { IonIcon, IonSpinner } from '@ionic/react';
import { callOutline, locationOutline, navigateOutline, chatbubbleOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import type { Order } from '../../types';
import { navigationHref, type RiderTripPhase } from './fleetTrip';

export function RiderTripCard({ trip, phase, when, pending, onMove }: {
  trip: Order;
  phase: RiderTripPhase;
  when: string | null;
  pending: boolean;
  onMove: (status: 'on_the_way' | 'delivered') => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const maps = navigationHref(trip);
  const onRoute = phase === 'route';
  return (
    <article className="fleet-trip rider-trip-card" aria-busy={pending}>
      <div className="rider-trip-meta">
        {trip.orderNumber ? <strong>#{trip.orderNumber}</strong> : null}
        {!onRoute && when ? <span>{when}</span> : null}
      </div>
      <h2>{onRoute ? trip.customerName || t('rider.customerUnknown') : trip.branchName || t('rider.localUnknown')}</h2>
      <div className="rider-trip-destination">
        <IonIcon icon={locationOutline} aria-hidden="true" />
        <div><p>{trip.address || t('rider.addressUnknown')}</p>
        {trip.addressReference ? <p className="rider-trip-reference">{trip.addressReference}</p> : null}</div>
      </div>
      {onRoute && trip.paymentMethod === 'cash' ? <p className="rider-trip-collection">{t('rider.collect', { amount: trip.total })}</p> : null}
      {onRoute && trip.phone ? (
        <div className="trip-contact">
          <a className="ag-btn" href={`tel:${trip.phone}`}><IonIcon icon={callOutline} aria-hidden="true" />{t('rider.call')}</a>
          <a className="ag-btn" href={`https://wa.me/${trip.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><IonIcon icon={chatbubbleOutline} aria-hidden="true" />{t('rider.whatsapp')}</a>
        </div>
      ) : null}
      {(onRoute || phase === 'kitchen') && maps ? <a className="ag-btn rider-trip-navigate" href={maps}><IonIcon icon={navigateOutline} aria-hidden="true" />{t('rider.navigate')}</a> : null}
      {onRoute || phase === 'kitchen' ? <button type="button" className="ag-btn ag-btn--primary rider-trip-next" disabled={pending} onClick={() => void onMove(onRoute ? 'delivered' : 'on_the_way')}>
        {pending ? <IonSpinner name="crescent" /> : null}{t(onRoute ? 'rider.delivered' : 'rider.arrived')}
      </button> : null}
    </article>
  );
}
