import { useState, type ReactNode } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { checkmarkCircleOutline, mapOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/AppHeader';
import { AppShell } from '../../components/AppShell';
import { StackLayout } from '../../components/layouts';
import { useApp } from '../../hooks/useApp';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useViewport } from '../../hooks/useViewport';
import {
  DISPATCH_DELIVERED_PATH,
  PARTNER_ACCOUNT_PATH,
  PARTNER_GROUPS_PATH,
  PARTNER_RIDERS_PATH,
  PARTNER_ZONES_PATH,
} from '../../navigation/motorizedScreens';
import { useFleetRiders } from './useFleetRiders';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types';
import { dispatchBoard } from './fleetTrip';

export function DispatchOrderCard({
  order,
  riderName,
  children,
}: {
  order: Order;
  riderName?: string;
  children?: ReactNode;
}) {
  return (
    <article className="motorized-card dispatch-order-card">
      <strong className="dispatch-order-card__number">{order.orderNumber ? `#${order.orderNumber}` : order.id}</strong>
      {order.branchName ? <p className="dispatch-order-card__branch">{order.branchName}</p> : null}
      {order.customerName ? <p>{order.customerName}</p> : null}
      {order.address ? <p className="dispatch-order-card__address">{order.address}</p> : null}
      {riderName ? <p className="dispatch-order-card__rider"><IonIcon icon={personOutline} aria-hidden="true" />{riderName}</p> : null}
      {children}
    </article>
  );
}

export function DispatchQueue() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const { orders, ordersError, loading, refreshOrders } = useApp();
  const {riders: fleetRiders, error: ridersError, loading: ridersLoading} = useFleetRiders();
  const riders = (fleetRiders ?? []).filter(rider => rider.isActive !== false);
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  const board = dispatchBoard(orders);
  const workEmpty = board.unassigned.length + board.assigned.length + board.onTheWay.length === 0;
  const riderName = (riderId?: string) => riders.find((rider) => rider.id === riderId)?.fullName;

  const assign = async (orderId: string, riderId: string) => {
    if (pendingId) return;
    setError('');
    setPendingId(orderId);
    try {
      await orderService.assignOrderRider(orderId, riderId);
      await refreshOrders();
    } catch {
      setError(t('motorized.assignFailed'));
    } finally {
      setPendingId('');
    }
  };

  const actions = (
    <div className="motorized-actions">
      <button type="button" className="ag-header-action ag-header-action--icon" aria-label={t('motorized.zones')} onClick={() => go(PARTNER_ZONES_PATH)}>
        <IonIcon icon={mapOutline} />
        {isTablet ? <span>{t('motorized.zones')}</span> : null}
      </button>
      <button type="button" className="ag-header-action ag-header-action--icon" aria-label={t('motorized.groups')} onClick={() => go(PARTNER_GROUPS_PATH)}>
        <IonIcon icon={peopleOutline} />
        {isTablet ? <span>{t('motorized.groups')}</span> : null}
      </button>
      <button type="button" className="ag-header-action ag-header-action--icon" aria-label={t('motorized.account')} onClick={() => go(PARTNER_ACCOUNT_PATH)}>
        <IonIcon icon={personOutline} />
        {isTablet ? <span>{t('motorized.account')}</span> : null}
      </button>
    </div>
  );

  const section = (title: string, rows: Order[], emptyKey: string, withAssign = false) => (
    <section className="fleet-section dispatch-section">
      <div className="dispatch-section-head"><h2>{title}</h2><span>{rows.length}</span></div>
      {rows.length === 0 ? (workEmpty ? null : <p>{t(emptyKey)}</p>) : rows.map((order) => (
        <DispatchOrderCard key={order.id} order={order} riderName={withAssign ? undefined : riderName(order.riderId)}>
          {withAssign ? (
            <label className="fleet-rider-field">
              <span>{t('motorized.chooseRider')}</span>
              <select
                value=""
                disabled={Boolean(pendingId) || ridersLoading || ridersError || riders.length === 0}
                onChange={(event) => {
                  const riderId = event.target.value;
                  if (riderId) void assign(order.id, riderId);
                }}
              >
                <option value="">{ridersLoading ? t('app.loading') : ridersError ? t('motorized.ridersError') : riders.length === 0 ? t('motorized.noRiders') : t('motorized.chooseRider')}</option>
                {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.fullName}</option>)}
              </select>
            </label>
          ) : null}
        </DispatchOrderCard>
      ))}
    </section>
  );

  return (
    <IonPage data-ag-route="/app/operations">
      <IonContent className="ag-screen">
        <AppShell>
          <div className="fleet-screen">
            <AppHeader title={t('motorized.dispatch')} showAlerts={false} trailing={actions} />
            <div className="ag-body module-body ag-page-stack fleet-list dispatch-list">
              <div className="fleet-links">
                <button type="button" className="fleet-row" onClick={() => go(PARTNER_RIDERS_PATH)}>{t('motorized.riders')}</button>
                <button type="button" className="fleet-row" onClick={() => go(DISPATCH_DELIVERED_PATH)}>{t('motorized.delivered')}</button>
              </div>
              {ordersError ? (
                <div role="alert">
                  <p>{t('ops.reliability.unavailable')}</p>
                  <button type="button" className="ag-btn ag-btn--primary" onClick={() => void refreshOrders()}>{t('ops.reliability.retry')}</button>
                </div>
              ) : loading && orders.length === 0 ? (
                <p role="status">{t('ops.filters.loadingMessages')}</p>
              ) : (
                <>
                  {workEmpty ? <div className="dispatch-empty" role="status"><IonIcon icon={peopleOutline} aria-hidden="true" /><p>{t('motorized.queueClear')}</p></div> : null}
                  {!workEmpty ? section(t('motorized.unassigned'), board.unassigned, 'motorized.emptyQueue', true) : null}
                  {!workEmpty ? section(t('motorized.assigned'), board.assigned, 'motorized.emptyAssigned') : null}
                  {!workEmpty ? section(t('motorized.onTheWay'), board.onTheWay, 'motorized.emptyOnTheWay') : null}
                </>
              )}
              {ridersError ? <p role="alert">{t('motorized.ridersError')}</p> : null}
              {error ? <p role="alert">{error}</p> : null}
            </div>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
}

export function DeliveredOrdersList({ orders }: { orders: Order[] }) {
  const { t } = useTranslation();
  if (orders.length === 0) return <div className="dispatch-empty" role="status"><IonIcon icon={checkmarkCircleOutline} aria-hidden="true" /><p>{t('motorized.emptyDelivered')}</p></div>;
  return <div className="delivered-orders-list">
    <div className="dispatch-section-head"><span>{orders.length}</span><span className="delivered-orders-label">{t('motorized.loadedDeliveries')}</span></div>
    {orders.map(order => <DispatchOrderCard key={order.id} order={order}><span className="delivered-order-status"><IonIcon icon={checkmarkCircleOutline} aria-hidden="true" />{t('ops.subStates.delivered')}</span></DispatchOrderCard>)}
  </div>;
}

export function DispatchDelivered() {
  const { t } = useTranslation();
  const { orders, ordersError, loading, refreshOrders } = useApp();
  const delivered = dispatchBoard(orders).delivered;

  return (
    <StackLayout title={t('motorized.delivered')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack fleet-list">
      {ordersError ? (
        <div role="alert">
          <p>{t('ops.reliability.unavailable')}</p>
          <button type="button" className="ag-btn ag-btn--primary" onClick={() => void refreshOrders()}>{t('ops.reliability.retry')}</button>
        </div>
      ) : loading && delivered.length === 0 ? (
        <p role="status">{t('ops.filters.loadingMessages')}</p>
      ) : <DeliveredOrdersList orders={delivered} />}
    </StackLayout>
  );
}
