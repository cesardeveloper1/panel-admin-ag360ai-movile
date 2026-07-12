import { useMemo, useState } from 'react';
import { IonContent, IonPage, IonSearchbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { KanbanBoard } from '../components/KanbanBoard';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailSheet } from '../components/OrderDetailSheet';
import { useApp } from '../context/AppContext';
import { getKanbanGroup, getKanbanSubState } from '../services/apiMock';
import type { KanbanSubState, Order } from '../types';

const NEW_SUBSTATES: KanbanSubState[] = ['starting', 'ordering', 'human'];
const PROCESSING_SUBSTATES: KanbanSubState[] = ['in_kitchen', 'ready', 'on_the_way'];

const OPS_SEGMENT_COLORS = {
  new: 'var(--ag-pulse)',
  processing: 'var(--ag-hot)',
  delivered: 'var(--ag-done)',
} as const;

const OperationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { orders } = useApp();
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        t(o.customerKey).toLowerCase().includes(q),
    );
  }, [orders, query, t]);

  const groups = useMemo(
    () => ({
      new: filtered.filter((o) => getKanbanGroup(o.status) === 'new'),
      processing: filtered.filter((o) => getKanbanGroup(o.status) === 'processing'),
      delivered: filtered.filter((o) => getKanbanGroup(o.status) === 'delivered'),
    }),
    [filtered],
  );

  const proportionSegments = useMemo(
    () => [
      { id: 'new' as const, count: groups.new.length, label: t('ops.kanbanNew') },
      { id: 'processing' as const, count: groups.processing.length, label: t('ops.kanbanProcessing') },
      { id: 'delivered' as const, count: groups.delivered.length, label: t('ops.kanbanDelivered') },
    ],
    [groups, t],
  );

  const proportionTotal = proportionSegments.reduce((sum, seg) => sum + seg.count, 0);

  const bySubState = (list: Order[], subState: KanbanSubState) =>
    list.filter((o) => getKanbanSubState(o) === subState);

  const renderSubSection = (subState: KanbanSubState, list: Order[]) => {
    const items = bySubState(list, subState);
    if (items.length === 0) return null;
    return (
      <div key={subState} className="kanban-subsection">
        <h3 className="kanban-subsection-title">
          {t(`ops.subStates.${subState}`)}
          <span className="kanban-count">{items.length}</span>
        </h3>
        <div className="kanban-cards">
          {items.map((order, idx) => (
            <OrderCard
              key={order.id}
              order={order}
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() => setSelectedOrder(order)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
          <AppHeader
            centeredCompact
            title={t('ops.title')}
          />
          <div className="ag-body module-body ops-body ag-page-stack">
            <IonSearchbar
              className="ops-search ag-enter"
              value={query}
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
              placeholder={t('ops.search')}
              debounce={200}
            />

            <div className="ops-summary ag-enter">
              <div className="ops-summary-card ops-summary-card--new">
                <strong>{groups.new.length}</strong>
                <span>{t('ops.kanbanNew')}</span>
              </div>
              <div className="ops-summary-card ops-summary-card--hot">
                <strong>{groups.processing.length}</strong>
                <span>{t('ops.kanbanProcessing')}</span>
              </div>
              <div className="ops-summary-card ops-summary-card--done">
                <strong>{groups.delivered.length}</strong>
                <span>{t('ops.kanbanDelivered')}</span>
              </div>
            </div>

            <div className="ops-proportion ag-enter" aria-hidden={proportionTotal === 0}>
              <div
                className="ops-proportion-bar"
                role="img"
                aria-label={t('ops.proportionAria', { total: proportionTotal })}
              >
                {proportionTotal > 0 ? (
                  proportionSegments.map((seg) =>
                    seg.count > 0 ? (
                      <span
                        key={seg.id}
                        className="ops-proportion-segment"
                        style={{
                          flex: seg.count,
                          background: OPS_SEGMENT_COLORS[seg.id],
                        }}
                        title={`${seg.label}: ${seg.count}`}
                      />
                    ) : null,
                  )
                ) : (
                  <span className="ops-proportion-segment ops-proportion-segment--empty" />
                )}
              </div>
            </div>

            <KanbanBoard>
              <section className="kanban-section kanban-section--new">
                <header className="kanban-section-head">
                  <h2>{t('ops.kanbanNew')}</h2>
                  <span className="kanban-count">{groups.new.length}</span>
                </header>
                {NEW_SUBSTATES.map((sub) => renderSubSection(sub, groups.new))}
                {groups.new.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
              </section>

              <section className="kanban-section kanban-section--processing">
                <header className="kanban-section-head">
                  <h2>{t('ops.kanbanProcessing')}</h2>
                  <span className="kanban-count">{groups.processing.length}</span>
                </header>
                {PROCESSING_SUBSTATES.map((sub) => renderSubSection(sub, groups.processing))}
                {groups.processing.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
              </section>

              <section className="kanban-section kanban-section--delivered">
                <header className="kanban-section-head">
                  <h2>{t('ops.kanbanDelivered')}</h2>
                  <span className="kanban-count">{groups.delivered.length}</span>
                </header>
                <div className="kanban-cards">
                  {groups.delivered.map((order, idx) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                </div>
                {groups.delivered.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
              </section>
            </KanbanBoard>
          </div>
          <OrderDetailSheet
            order={selectedOrder}
            open={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default OperationsPage;
