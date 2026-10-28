import { useMemo, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { mapOutline, peopleOutline, personOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../../components/AppHeader';
import { AppShell } from '../../components/AppShell';
import { useApp } from '../../hooks/useApp';
import { useAppNavigation } from '../../hooks/useAppNavigation';
import { useViewport } from '../../hooks/useViewport';
import { MOTORIZED_BOARD_STATUSES, PARTNER_ACCOUNT_PATH, PARTNER_GROUPS_PATH, PARTNER_ZONES_PATH } from '../../navigation/motorizedScreens';
import type { Order, OrderStatus } from '../../types';

const COLUMNS: Array<{ status: (typeof MOTORIZED_BOARD_STATUSES)[number]; labelKey: string }> = [
  { status: 'in_kitchen', labelKey: 'motorized.inKitchen' },
  { status: 'on_the_way', labelKey: 'motorized.onRoute' },
  { status: 'delivered', labelKey: 'motorized.delivered' },
];

export function MotorizedBoard() {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const { orders, ordersError, loading, refreshOrders, setMotorizedOrderStatus } = useApp();
  const [segment, setSegment] = useState<(typeof MOTORIZED_BOARD_STATUSES)[number]>('in_kitchen');
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const visible = useMemo(
    () => orders.filter((order) => MOTORIZED_BOARD_STATUSES.includes(order.status as (typeof MOTORIZED_BOARD_STATUSES)[number])),
    [orders],
  );
  const move = async (order: Order, status: OrderStatus) => {
    setError('');
    const result = await setMotorizedOrderStatus(order.id, status);
    if (!result.ok) setError(t('motorized.statusFailed'));
    else setSelected(null);
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
  const column = (status: (typeof MOTORIZED_BOARD_STATUSES)[number]) => (
    <section key={status} className="motorized-column">
      <h2>{t(COLUMNS.find((item) => item.status === status)?.labelKey ?? status)}</h2>
      {visible.filter((order) => order.status === status).map((order) => (
        <article key={order.id} className="ops-connection motorized-card">
          <button type="button" onClick={() => setSelected(order)}>
            <strong>{order.orderNumber ? `#${order.orderNumber}` : order.customerName}</strong>
            <p>{order.customerName}</p>
          </button>
          <div className="motorized-status">
            {COLUMNS.map((item) => (
              <button
                key={item.status}
                type="button"
                aria-pressed={order.status === item.status}
                onClick={() => void move(order, item.status)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );

  return (
    <IonPage data-ag-route="/app/operations">
      <IonContent className="ag-screen">
        <AppShell>
          <AppHeader title={t('motorized.deliveries')} showAlerts={false} trailing={actions} />
          <div className="ag-body module-body ag-page-stack motorized-board">
            {ordersError ? (
              <div role="alert">
                <p>{t('ops.reliability.unavailable')}</p>
                <button type="button" className="ag-btn" onClick={() => void refreshOrders()}>{t('ops.reliability.retry')}</button>
              </div>
            ) : loading && visible.length === 0 ? (
              <p role="status">{t('ops.filters.loadingMessages')}</p>
            ) : (
              <>
                {isTablet ? null : (
                  <div className="motorized-segments" role="tablist">
                    {COLUMNS.map((item) => (
                      <button key={item.status} type="button" role="tab" aria-selected={segment === item.status} onClick={() => setSegment(item.status)}>
                        {t(item.labelKey)}
                      </button>
                    ))}
                  </div>
                )}
                <div className={isTablet ? 'motorized-columns' : ''}>
                  {(isTablet ? MOTORIZED_BOARD_STATUSES : [segment]).map((status) => column(status))}
                </div>
                {visible.length === 0 ? <p>{t('motorized.empty')}</p> : null}
              </>
            )}
            {error ? <p role="alert">{error}</p> : null}
            {selected ? (
              <section className="motorized-detail">
                <h2>{selected.orderNumber ? `#${selected.orderNumber}` : selected.customerName}</h2>
                <p>{selected.customerName}</p>
                <button type="button" className="ag-btn" onClick={() => void move(selected, 'cancelled')}>{t('motorized.cancel')}</button>
                <button type="button" className="ag-btn" onClick={() => setSelected(null)}>{t('common.close')}</button>
              </section>
            ) : null}
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
}
