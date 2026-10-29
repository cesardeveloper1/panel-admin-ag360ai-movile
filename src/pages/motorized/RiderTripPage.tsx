import { useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/AppHeader';
import { AppShell } from '../../components/AppShell';
import { useApp } from '../../hooks/useApp';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { PROFILE_PATH } from '../../navigation/appRouteRegistry';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types';
import { navigationHref, riderScreen } from './fleetTrip';
import { useFleetSchedule } from './useFleetSchedule';

const ACTIVE_KEY = 'fleet-active-trip';

export function RiderTripPage() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { orders, ordersError, loading, refreshOrders, setRiderOrderStatus, session } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(() => sessionStorage.getItem(ACTIVE_KEY));
  const [detail, setDetail] = useState<Order | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const screen = riderScreen(orders, selectedId);
  const trip = screen.kind === 'trip' ? { ...screen.order, ...detail, id: screen.order.id, status: screen.order.status } : null;
  const { withinHours } = useFleetSchedule(session?.role === 'rider');

  useEffect(() => {
    if (screen.kind === 'trip') sessionStorage.setItem(ACTIVE_KEY, screen.order.id);
    else sessionStorage.removeItem(ACTIVE_KEY);
  }, [screen]);

  useEffect(() => {
    if (screen.kind !== 'trip') {
      setDetail(null);
      return;
    }
    let active = true;
    void orderService.getFleetOrderDetail(screen.order)
      .then((next) => { if (active) setDetail(next); })
      .catch(() => { if (active) setDetail(null); });
    return () => { active = false; };
  }, [screen.kind === 'trip' ? screen.order.id : '', screen.kind === 'trip' ? screen.order.status : '']);

  useEffect(() => {
    if (session?.role !== 'rider') return;
    const state = !withinHours ? 'off_hours' : trip?.status === 'on_the_way' ? 'tracking' : 'online';
    void orderService.setFleetPresence(state).catch(() => undefined);
  }, [session?.role, withinHours, trip?.id, trip?.status]);

  useEffect(() => {
    if (!trip || trip.status !== 'on_the_way' || !withinHours || !navigator.geolocation) return;
    let lastSent = 0;
    const watch = navigator.geolocation.watchPosition((position) => {
      const now = Date.now();
      if (now - lastSent < 15_000) return;
      lastSent = now;
      void orderService.postFleetLocation(trip.id, position.coords.latitude, position.coords.longitude).catch(() => undefined);
    }, () => undefined, { enableHighAccuracy: true, maximumAge: 15_000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [trip?.id, trip?.status, withinHours]);

  const move = async (status: 'on_the_way' | 'delivered') => {
    if (!trip) return;
    setError('');
    setPending(true);
    const result = await setRiderOrderStatus(trip.id, status);
    setPending(false);
    if (!result.ok) setError(t('rider.statusFailed'));
    else if (status === 'delivered') setSelectedId(null);
  };

  const copyLink = async () => {
    if (!trip?.sharingLink) return;
    try {
      await navigator.clipboard.writeText(trip.sharingLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const maps = trip ? navigationHref(trip) : null;

  return (
    <IonPage data-ag-route="/app/trip">
      <IonContent className="ag-screen">
        <AppShell hideNav>
          <div className="fleet-screen trip-screen">
            <AppHeader
              title={t('rider.title')}
              showAlerts={false}
              action={{ label: t('nav.profile'), onClick: () => go(PROFILE_PATH), iconOnly: false }}
            />
            <div className="ag-body module-body ag-page-stack fleet-list">
              {ordersError ? (
                <div role="alert">
                  <p>{t('ops.reliability.unavailable')}</p>
                  <button type="button" className="ag-btn" onClick={() => void refreshOrders()}>{t('ops.reliability.retry')}</button>
                </div>
              ) : loading && orders.length === 0 ? (
                <p role="status">{t('ops.filters.loadingMessages')}</p>
              ) : screen.kind === 'list' ? (
                screen.orders.length === 0 ? <p>{t('rider.empty')}</p> : screen.orders.map((order) => (
                  <button key={order.id} type="button" className="ops-connection motorized-card fleet-choice" onClick={() => setSelectedId(order.id)}>
                    <strong>{order.orderNumber ? `#${order.orderNumber}` : order.customerName}</strong>
                    <p>{order.branchName || order.address || t('rider.localUnknown')}</p>
                  </button>
                ))
              ) : trip ? (
                <article className="fleet-trip">
                  <h2>{trip.branchName || t('rider.localUnknown')}</h2>
                  <p>{trip.address || t('rider.addressUnknown')}</p>
                  {trip.addressReference ? <p>{trip.addressReference}</p> : null}
                  {trip.phone ? <a href={`tel:${trip.phone}`}>{trip.phone}</a> : null}
                  {trip.items.length > 0 ? (
                    <ul>{trip.items.map((item, index) => <li key={`${item.name ?? item.nameKey}-${index}`}>{item.qty} × {item.name || t(item.nameKey)}</li>)}</ul>
                  ) : null}
                  {trip.paymentMethod === 'cash' ? <p>{t('rider.collect', { amount: trip.total })}</p> : null}
                  {maps ? <a className="ag-btn" href={maps}>{t('rider.navigate')}</a> : null}
                  {trip.sharingLink ? (
                    <button type="button" className="ag-btn" onClick={() => void copyLink()}>
                      {copied ? t('rider.copied') : t('rider.copyLink')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ag-btn ag-btn--primary"
                    disabled={pending}
                    onClick={() => void move(trip.status === 'on_the_way' ? 'delivered' : 'on_the_way')}
                  >
                    {t(trip.status === 'on_the_way' ? 'rider.delivered' : 'rider.arrived')}
                  </button>
                </article>
              ) : null}
              {error ? <p role="alert">{error}</p> : null}
            </div>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
}
