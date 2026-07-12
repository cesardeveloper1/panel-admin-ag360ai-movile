import { useMemo, useRef, useState } from 'react';
import { IonContent, IonPage, IonSearchbar } from '@ionic/react';
import { searchOutline } from 'ionicons/icons';
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
  const [viewMode, setViewMode] = useState<'orders' | 'all'>('orders');
  const [allStage, setAllStage] = useState<'starting' | 'ordering' | 'human' | 'orders'>('starting');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLIonSearchbarElement>(null);
  const newOrdersRef = useRef<HTMLElement>(null);
  const processingOrdersRef = useRef<HTMLElement>(null);
  const deliveredOrdersRef = useRef<HTMLElement>(null);

  const scrollToOrders = (target: React.RefObject<HTMLElement | null>) => {
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const allStageItems = allStage === 'orders'
    ? filtered
    : filtered.filter((order) => getKanbanSubState(order) === allStage);

  const openSearch = () => {
    setSearchOpen((current) => !current);
    window.setTimeout(() => searchRef.current?.setFocus(), 80);
  };

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
            action={{ label: t('ops.search'), icon: searchOutline, iconOnly: true, onClick: openSearch }}
          />
          <div className="ag-body module-body ops-body ag-page-stack">
            {searchOpen ? <IonSearchbar
              ref={searchRef}
              className="ops-search ag-enter"
              value={query}
              onIonInput={(e) => setQuery(e.detail.value ?? '')}
              placeholder={t('ops.search')}
              debounce={200}
            /> : null}

            <div className="ops-view-switch ag-enter" role="tablist" aria-label={t('ops.title')}>
              <button type="button" className={viewMode === 'orders' ? 'active' : ''} onClick={() => setViewMode('orders')}>{t('ops.ordersView')}</button>
              <button type="button" className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')}>{t('ops.allView')}</button>
            </div>

            {viewMode === 'all' ? (
              <>
                <div className="ops-all-stages ag-enter">
                  {(['starting', 'ordering', 'human', 'orders'] as const).map((stage) => (
                    <button key={stage} type="button" className={allStage === stage ? 'active' : ''} onClick={() => setAllStage(stage)}>
                      {stage === 'orders' ? t('ops.ordersStage') : t(`ops.subStates.${stage}`)}
                    </button>
                  ))}
                </div>
                <section className="kanban-section ops-all-results ag-enter">
                  <header className="kanban-section-head">
                    <h2>{allStage === 'orders' ? t('ops.ordersStage') : t(`ops.subStates.${allStage}`)}</h2>
                    <span className="kanban-count">{allStageItems.length}</span>
                  </header>
                  <div className="kanban-cards">
                    {allStageItems.map((order, idx) => <OrderCard key={order.id} order={order} style={{ animationDelay: `${idx * 40}ms` }} onClick={() => setSelectedOrder(order)} />)}
                  </div>
                  {allStageItems.length === 0 ? <p className="kanban-empty">{t('ops.emptyColumn')}</p> : null}
                </section>
              </>
            ) : (
              <>

            <div className="ops-summary ag-enter">
              <button type="button" className="ops-summary-card ops-summary-card--new" onClick={() => scrollToOrders(newOrdersRef)}>
                <strong>{groups.new.length}</strong>
                <span>{t('ops.kanbanNew')}</span>
              </button>
              <button type="button" className="ops-summary-card ops-summary-card--hot" onClick={() => scrollToOrders(processingOrdersRef)}>
                <strong>{groups.processing.length}</strong>
                <span>{t('ops.kanbanProcessing')}</span>
              </button>
              <button type="button" className="ops-summary-card ops-summary-card--done" onClick={() => scrollToOrders(deliveredOrdersRef)}>
                <strong>{groups.delivered.length}</strong>
                <span>{t('ops.kanbanDelivered')}</span>
              </button>
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
              <section ref={newOrdersRef} className="kanban-section kanban-section--new">
                <header className="kanban-section-head">
                  <h2>{t('ops.kanbanNew')}</h2>
                  <span className="kanban-count">{groups.new.length}</span>
                </header>
                {NEW_SUBSTATES.map((sub) => renderSubSection(sub, groups.new))}
                {groups.new.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
              </section>

              <section ref={processingOrdersRef} className="kanban-section kanban-section--processing">
                <header className="kanban-section-head">
                  <h2>{t('ops.kanbanProcessing')}</h2>
                  <span className="kanban-count">{groups.processing.length}</span>
                </header>
                {PROCESSING_SUBSTATES.map((sub) => renderSubSection(sub, groups.processing))}
                {groups.processing.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
              </section>

              <section ref={deliveredOrdersRef} className="kanban-section kanban-section--delivered">
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
              </>
            )}
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
