import { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { KitchenOrderCard } from '../components/KitchenOrderCard';
import { useApp } from '../context/AppContext';

const KitchenPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { brand, orders, advanceOrder } = useApp();

  const kitchenOrders = useMemo(
    () => orders.filter((o) => ['accepted', 'in_kitchen', 'ready'].includes(o.status)),
    [orders],
  );

  const stats = useMemo(
    () => ({
      waiting: kitchenOrders.filter((o) => o.status === 'accepted').length,
      cooking: kitchenOrders.filter((o) => o.status === 'in_kitchen').length,
      ready: kitchenOrders.filter((o) => o.status === 'ready').length,
    }),
    [kitchenOrders],
  );

  return (
    <IonPage>
      <IonContent className="ag-screen ag-app--kitchen">
        <AppShell>
          <AppHeader
            title={t('kitchen.title')}
            subtitle={brand ? `${t(brand.nameKey)} · ${t('kitchen.subtitle')}` : t('kitchen.subtitle')}
            showAlerts
            backLabel={t('ops.modeOperator')}
            onBack={() => history.replace('/app/operations')}
          />
          <div className="kitchen-stats-bar ag-enter">
            <div className="kitchen-stat-pill">
              <strong>{stats.waiting}</strong>
              {t('kitchen.statsWaiting')}
            </div>
            <div className="kitchen-stat-pill kitchen-stat-pill--hot">
              <strong>{stats.cooking}</strong>
              {t('kitchen.statsCooking')}
            </div>
            <div className="kitchen-stat-pill kitchen-stat-pill--done">
              <strong>{stats.ready}</strong>
              {t('kitchen.statsReady')}
            </div>
          </div>
          <div className="ag-body module-body">
            <div className="kitchen-list">
              {kitchenOrders.map((order, idx) => (
                <KitchenOrderCard
                  key={order.id}
                  order={order}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  onAction={() => void advanceOrder(order.id)}
                />
              ))}
            </div>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default KitchenPage;
