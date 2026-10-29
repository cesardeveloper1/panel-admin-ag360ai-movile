import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { mapOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/AppHeader';
import { AppShell } from '../../components/AppShell';
import { useApp } from '../../hooks/useApp';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useViewport } from '../../hooks/useViewport';
import { PARTNER_ACCOUNT_PATH, PARTNER_GROUPS_PATH, PARTNER_ZONES_PATH } from '../../navigation/motorizedScreens';
import { deliveryPartnerClient } from '../../services/deliveryPartnerClient';
import { orderService } from '../../services/orderService';
import { unassignedDispatchOrders } from './fleetTrip';

export function DispatchQueue() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const { orders, ordersError, loading, refreshOrders } = useApp();
  const [riders, setRiders] = useState<Array<{ id: string; fullName: string; isActive?: boolean }>>([]);
  const [ridersError, setRidersError] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  const queue = unassignedDispatchOrders(orders);

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

  return (
    <IonPage data-ag-route="/app/operations">
      <IonContent className="ag-screen">
        <AppShell>
          <div className="fleet-screen">
            <AppHeader title={t('motorized.unassigned')} showAlerts={false} trailing={actions} />
            <div className="ag-body module-body ag-page-stack fleet-list">
              {ordersError ? (
                <div role="alert">
                  <p>{t('ops.reliability.unavailable')}</p>
                  <button type="button" className="ag-btn" onClick={() => void refreshOrders()}>{t('ops.reliability.retry')}</button>
                </div>
              ) : loading && queue.length === 0 ? (
                <p role="status">{t('ops.filters.loadingMessages')}</p>
              ) : queue.length === 0 ? (
                <p>{t('motorized.emptyQueue')}</p>
              ) : queue.map((order) => (
                <article key={order.id} className="ops-connection motorized-card">
                  <strong>{order.orderNumber ? `#${order.orderNumber}` : order.customerName}</strong>
                  <p>{order.branchName || order.address || order.customerName}</p>
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
                </article>
              ))}
              {ridersError ? <p role="alert">{t('motorized.ridersError')}</p> : null}
              {error ? <p role="alert">{error}</p> : null}
            </div>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
}
