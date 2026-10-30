import { useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/AppHeader';
import { AppShell } from '../../components/AppShell';
import { useApp } from '../../hooks/useApp';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { PROFILE_PATH } from '../../navigation/appRouteRegistry';
import { orderService } from '../../services/orderService';
import { sessionDisplayName } from '../../utils/sessionDisplayName';
import type { Order } from '../../types';
import { riderScreen, type RiderTripPhase } from './fleetTrip';
import { useFleetSchedule } from './useFleetSchedule';
import { RiderTripCard } from './RiderTripCard';

const PHASE_TITLE: Record<RiderTripPhase | 'empty', string> = {
  empty: 'rider.phaseEmpty',
  waiting: 'rider.phaseWaiting',
  kitchen: 'rider.phaseKitchen',
  route: 'rider.phaseRoute',
};

function tripWhen(value: string | undefined, language: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language, {
    timeZone: 'America/Lima',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function RiderTripPage() {
  const { t, i18n } = useTranslation();
  const { go } = useAppNavigation();
  const { orders, ordersError, loading, refreshOrders, setRiderOrderStatus, session } = useApp();
  const [detail, setDetail] = useState<Order | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const screen = riderScreen(orders);
  const phase: RiderTripPhase | 'empty' = screen.kind === 'trip' ? screen.phase : 'empty';
  const trip = screen.kind === 'trip'
    ? { ...screen.order, ...detail, id: screen.order.id, status: screen.order.status }
    : null;
  const { withinHours, shift } = useFleetSchedule(session?.role === 'rider');
  const when = tripWhen(trip?.scheduledAt, i18n.language);

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
  };

  return (
    <IonPage data-ag-route="/app/trip">
      <IonContent className="ag-screen">
        <AppShell hideNav>
          <div className="fleet-screen trip-screen">
            <AppHeader
              title={t(PHASE_TITLE[phase])}
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
              ) : !trip ? (
                <article className="fleet-trip rider-trip-empty" role="status">
                  <h2>{sessionDisplayName(session, t)}</h2>
                  {shift === 'on' ? <p>{t('rider.onShift')}</p> : null}
                  {shift === 'off' ? <p>{t('rider.offHours')}</p> : null}
                  <p>{t('rider.empty')}</p>
                </article>
              ) : (
                <RiderTripCard trip={trip} phase={phase === 'empty' ? 'waiting' : phase} when={when} pending={pending} onMove={move} />
              )}
              {error ? <p role="alert">{error}</p> : null}
            </div>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
}
