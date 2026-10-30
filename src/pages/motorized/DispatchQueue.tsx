import { useEffect, useState, type ReactNode } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { mapOutline, peopleOutline, personOutline } from 'ionicons/icons';
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
import { deliveryPartnerClient } from '../../services/deliveryPartnerClient';
import { orderService } from '../../services/orderService';
import type { Order } from '../../types';
import { dispatchBoard } from './fleetTrip';

function OrderRow({
  order,
  riderName,
  children,
}: {
  order: Order;
  riderName?: string;
  children?: ReactNode;
}) {
  const place = order.branchName || order.address || order.customerName;
  return (
    <article className="ops-connection motorized-card">
      <strong>{order.orderNumber ? `#${order.orderNumber}` : order.customerName}</strong>
      {place ? <p>{place}</p> : null}
      {order.address && order.branchName ? <p>{order.address}</p> : null}
      {riderName ? <p>{riderName}</p> : null}
      {children}
    </article>
  );
}

export function DispatchQueue() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const { orders, ordersError, loading, refreshOrders } = useApp();
  const [riders, setRiders] = useState<Array<{ id: string; fullName: string; isActive?: boolean }>>([]);
  const [ridersError, setRidersError] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  const board = dispatchBoard(orders);
  const workEmpty = board.unassigned.length + board.assigned.length + board.onTheWay.length === 0;
  const riderName = (riderId?: string) => riders.find((rider) => rider.id === riderId)?.fullName;

  useEffect(() => {
    let active = true;
    void deliveryPartnerClient.listRiders()
      .then((rows) => { if (active) setRiders(rows.filter((row) => row.isActive !== false)); })
      .catch(() => { if (active) setRidersError(true); });
    return () => { active = false; };
  }, []);

  const assign = async (orderId: string, riderId: string) => {
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
    <section className="fleet-section">
      <h2>{title}</h2>
      {rows.length === 0 ? (workEmpty ? null : <p>{t(emptyKey)}</p>) : rows.map((order) => (
        <OrderRow key={order.id} order={order} riderName={withAssign ? undefined : riderName(order.riderId)}>
          {withAssign ? (
            <label className="fleet-rider-field">
              <span>{t('motorized.chooseRider')}</span>
              <select
                value=""
                disabled={pendingId === order.id || riders.length === 0}
                onChange={(event) => {
                  const riderId = event.target.value;
                  if (riderId) void assign(order.id, riderId);
                }}
              >
                <option value="">{riders.length === 0 ? t('motorized.noRiders') : t('motorized.chooseRider')}</option>
                {riders.map((rider) => <option key={rider.id} value={rider.id}>{rider.fullName}</option>)}
              </select>
            </label>
          ) : null}
        </OrderRow>
      ))}
    </section>
  );

  return (
    <IonPage data-ag-route="/app/operations">
      <IonContent className="ag-screen">
        <AppShell>
          <div className="fleet-screen">
            <AppHeader title={t('motorized.dispatch')} showAlerts={false} trailing={actions} />
            <div className="ag-body module-body ag-page-stack fleet-list">
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
                  {workEmpty ? <p>{t('motorized.queueClear')}</p> : null}
                  {section(t('motorized.unassigned'), board.unassigned, 'motorized.emptyQueue', true)}
                  {section(t('motorized.assigned'), board.assigned, 'motorized.emptyAssigned')}
                  {section(t('motorized.onTheWay'), board.onTheWay, 'motorized.emptyOnTheWay')}
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
      ) : delivered.length === 0 ? (
        <p>{t('motorized.emptyDelivered')}</p>
      ) : delivered.map((order) => <OrderRow key={order.id} order={order} />)}
    </StackLayout>
  );
}
