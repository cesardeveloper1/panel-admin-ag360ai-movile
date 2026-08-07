import { useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonDatetime, IonIcon, IonModal, IonPage, IonSearchbar } from '@ionic/react';
import type { ScrollDetail } from '@ionic/react';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { KanbanBoard } from '../components/KanbanBoard';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailSheet } from '../components/OrderDetailSheet';
import { useApp } from '../context/AppContext';
import { getKanbanGroup, getKanbanSubState } from '../services/apiMock';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import type { KanbanSubState, Order } from '../types';

const NEW_SUBSTATES: KanbanSubState[] = ['starting', 'ordering', 'human'];
const PROCESSING_SUBSTATES: KanbanSubState[] = ['in_kitchen', 'ready', 'on_the_way'];

const OPS_SEGMENT_COLORS = {
  new: 'var(--ag-pulse)',
  processing: 'var(--ag-hot)',
  delivered: 'var(--ag-done)',
} as const;

const localIsoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const OperationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { orders } = useApp();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const pageRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'orders' | 'all'>('orders');
  const [allStage, setAllStage] = useState<'starting' | 'ordering' | 'human' | 'orders'>('starting');
  const [dateOpen, setDateOpen] = useState(false);
  const [dateStart, setDateStart] = useState(() => localIsoDate(new Date()));
  const [dateEnd, setDateEnd] = useState<string | null>(null);
  const [dateClicks, setDateClicks] = useState(0);
  const [dateMode, setDateMode] = useState<'today' | 'range'>('today');
  const [activeOrderState, setActiveOrderState] = useState<'new' | 'processing' | 'delivered'>('new');
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [visibleCards, setVisibleCards] = useState<Record<string, number>>({
    new: 3,
    processing: 3,
    delivered: 3,
    starting: 3,
    ordering: 3,
    human: 3,
    orders: 3,
  });
  const newOrdersRef = useRef<HTMLElement>(null);
  const processingOrdersRef = useRef<HTMLElement>(null);
  const deliveredOrdersRef = useRef<HTMLElement>(null);
  const lastScrollTopRef = useRef(0);

  const applyScrollTop = (nextScrollTopRaw: number) => {
    const nextScrollTop = Math.max(0, nextScrollTopRaw);
    const previousScrollTop = lastScrollTopRef.current;
    setIsPageScrolled(nextScrollTop > 8);
    if (Math.abs(nextScrollTop - previousScrollTop) > 4) {
      setIsScrollingUp(nextScrollTop < previousScrollTop);
      lastScrollTopRef.current = nextScrollTop;
    }
    if (nextScrollTop <= 8) setIsScrollingUp(true);
  };

  const handleOperationsScroll = (event: CustomEvent<ScrollDetail>) => {
    applyScrollTop(event.detail.scrollTop);
  };

  useEffect(() => {
    if (!isTablet) return;
    const main = pageRef.current?.querySelector('.ag-app-shell-main');
    if (!main) return;
    const onScroll = () => applyScrollTop((main as HTMLElement).scrollTop);
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, [isTablet]);

  const scrollToOrders = (
    state: 'new' | 'processing' | 'delivered',
    target: React.RefObject<HTMLElement | null>,
  ) => {
    setActiveOrderState(state);
    target.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (viewMode !== 'orders') return;
    const sections = [
      ['new', newOrdersRef.current],
      ['processing', processingOrdersRef.current],
      ['delivered', deliveredOrdersRef.current],
    ] as const;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const state = visible?.target.getAttribute('data-order-state');
        if (state === 'new' || state === 'processing' || state === 'delivered') {
          setActiveOrderState(state);
        }
      },
      { rootMargin: '-96px 0px -58% 0px', threshold: [0, 0.1, 0.35, 0.6] },
    );
    sections.forEach(([, section]) => section && observer.observe(section));
    return () => observer.disconnect();
  }, [viewMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byDate = orders.filter((order) => {
      const date = order.createdAt ?? localIsoDate(new Date());
      return date >= dateStart && date <= (dateEnd ?? dateStart);
    });
    if (!q) return byDate;
    return byDate.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        t(o.customerKey).toLowerCase().includes(q),
    );
  }, [orders, query, t, dateStart, dateEnd]);

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
  const visibleAllStageItems = allStageItems.slice(0, visibleCards[allStage]);
  const highlightedOperationDates = useMemo(() => {
    const end = dateEnd ?? dateStart;
    const cursor = new Date(`${dateStart}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    const dates = [];
    while (cursor <= last) {
      const date = localIsoDate(cursor);
      const boundary = date === dateStart || date === end;
      dates.push({ date, textColor: boundary ? '#ffffff' : '#5f2fc5', backgroundColor: boundary ? '#8746ff' : 'rgba(135, 70, 255, 0.16)' });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [dateStart, dateEnd]);

  const showThreeMore = (state: string) => {
    setVisibleCards((current) => ({ ...current, [state]: (current[state] ?? 3) + 3 }));
  };

  const hideThree = (state: string) => {
    setVisibleCards((current) => ({ ...current, [state]: Math.max(3, (current[state] ?? 3) - 3) }));
  };

  const cardToggleButtons = (state: string, visible: number, total: number) => (
    visible > 3 || visible < total ? (
      <div className="ops-load-controls">
        {visible > 3 ? <button type="button" className="ops-load-more" aria-label="Contraer 3 tarjetas" onClick={() => hideThree(state)}><IonIcon icon={chevronUpOutline} /></button> : null}
        {visible < total ? <button type="button" className="ops-load-more" aria-label={t('ops.showThreeMore')} onClick={() => showThreeMore(state)}><IonIcon icon={chevronDownOutline} /></button> : null}
      </div>
    ) : null
  );

  const selectOperationDate = (rawValue: string | string[] | null | undefined) => {
    const selected = (Array.isArray(rawValue) ? rawValue[0] : rawValue)?.slice(0, 10);
    if (!selected) return;

    if (dateMode === 'today') {
      setDateStart(selected);
      setDateEnd(null);
      setDateClicks(0);
      return;
    }

    if (dateClicks === 0 || dateEnd) {
      setDateStart(selected);
      setDateEnd(null);
      setDateClicks(1);
    } else if (selected < dateStart) {
      setDateEnd(dateStart);
      setDateStart(selected);
      setDateClicks(2);
    } else {
      setDateEnd(selected);
      setDateClicks(2);
    }
  };

  const openDatePicker = () => {
    const today = localIsoDate(new Date());
    const isRange = Boolean(dateEnd && dateEnd !== dateStart);
    setDateMode(isRange ? 'range' : dateStart === today ? 'today' : 'range');
    setDateClicks(0);
    setDateOpen(true);
  };

  const pickToday = () => {
    const today = localIsoDate(new Date());
    setDateMode('today');
    setDateStart(today);
    setDateEnd(null);
    setDateClicks(0);
  };

  const pickRangeMode = () => {
    setDateMode('range');
    setDateClicks(0);
    setDateEnd(null);
  };

  const formatOpsDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(
      new Date(y, m - 1, d),
    );
  };

  const openOrderChat = (order: Order) => {
    go(`/app/chats?customer=${encodeURIComponent(order.customerKey)}`);
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
              onChat={() => openOrderChat(order)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <IonPage
      ref={pageRef}
      className={`operations-page${isPageScrolled ? ' operations-page--scrolled' : ''}${isScrollingUp ? ' operations-page--scroll-up' : ' operations-page--scroll-down'}`}
    >
      <IonContent className="ag-screen" scrollEvents={!isTablet} onIonScroll={isTablet ? undefined : handleOperationsScroll}>
        <AppShell>
          <AppHeader
            centeredCompact
            title={t('ops.title')}
            showAlerts
          />
          <div className="ag-body module-body ops-body ag-page-stack">
            <button
              type="button"
              className="reports-range-summary ag-enter"
              onClick={openDatePicker}
              aria-label={t('ops.selectDate')}
            >
              {dateEnd
                ? `${dateStart.slice(8)}–${dateEnd.slice(8)}`
                : dateStart === localIsoDate(new Date())
                  ? t('ops.dateToday')
                  : dateStart.slice(8)}
            </button>

            <div className="ops-sticky-controls ag-enter">
              <div className="ops-view-switch" role="tablist" aria-label={t('ops.title')}>
                <button type="button" className={viewMode === 'orders' ? 'active' : ''} onClick={() => setViewMode('orders')}>{t('ops.ordersView')}</button>
                <button type="button" className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')}>{t('ops.allView')}</button>
              </div>

              <IonSearchbar
                className="ops-search"
                value={query}
                onIonInput={(e) => setQuery(e.detail.value ?? '')}
                placeholder={t('ops.search')}
                debounce={200}
              />
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
                    {visibleAllStageItems.map((order, idx) => <OrderCard key={order.id} order={order} style={{ animationDelay: `${idx * 40}ms` }} onClick={() => setSelectedOrder(order)} onChat={() => openOrderChat(order)} />)}
                  </div>
                  {allStageItems.length === 0 ? <p className="kanban-empty">{t('ops.emptyColumn')}</p> : null}
                  {cardToggleButtons(allStage, visibleAllStageItems.length, allStageItems.length)}
                </section>
              </>
            ) : (
              <>

            <div className="ops-summary ag-enter">
              <button type="button" aria-pressed={activeOrderState === 'new'} className={`ops-summary-card ops-summary-card--new${activeOrderState === 'new' ? ' active' : ''}`} onClick={() => scrollToOrders('new', newOrdersRef)}>
                <strong>{groups.new.length}</strong>
                <span>{t('ops.kanbanNew')}</span>
              </button>
              <button type="button" aria-pressed={activeOrderState === 'processing'} className={`ops-summary-card ops-summary-card--hot${activeOrderState === 'processing' ? ' active' : ''}`} onClick={() => scrollToOrders('processing', processingOrdersRef)}>
                <strong>{groups.processing.length}</strong>
                <span>{t('ops.kanbanProcessing')}</span>
              </button>
              <button type="button" aria-pressed={activeOrderState === 'delivered'} className={`ops-summary-card ops-summary-card--done${activeOrderState === 'delivered' ? ' active' : ''}`} onClick={() => scrollToOrders('delivered', deliveredOrdersRef)}>
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
              <section ref={newOrdersRef} data-order-state="new" className={`kanban-section kanban-section--new${activeOrderState === 'new' ? ' is-active' : ''}`}>
                {NEW_SUBSTATES.map((sub) => renderSubSection(sub, groups.new.slice(0, visibleCards.new)))}
                {groups.new.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
                {cardToggleButtons('new', Math.min(visibleCards.new, groups.new.length), groups.new.length)}
              </section>

              <section ref={processingOrdersRef} data-order-state="processing" className={`kanban-section kanban-section--processing${activeOrderState === 'processing' ? ' is-active' : ''}`}>
                {PROCESSING_SUBSTATES.map((sub) => renderSubSection(sub, groups.processing.slice(0, visibleCards.processing)))}
                {groups.processing.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
                {cardToggleButtons('processing', Math.min(visibleCards.processing, groups.processing.length), groups.processing.length)}
              </section>

              <section ref={deliveredOrdersRef} data-order-state="delivered" className={`kanban-section kanban-section--delivered${activeOrderState === 'delivered' ? ' is-active' : ''}`}>
                <div className="kanban-cards">
                  {groups.delivered.slice(0, visibleCards.delivered).map((order, idx) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      onClick={() => setSelectedOrder(order)}
                      onChat={() => openOrderChat(order)}
                    />
                  ))}
                </div>
                {groups.delivered.length === 0 ? (
                  <p className="kanban-empty">{t('ops.emptyColumn')}</p>
                ) : null}
                {cardToggleButtons('delivered', Math.min(visibleCards.delivered, groups.delivered.length), groups.delivered.length)}
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
          <IonModal
            isOpen={dateOpen}
            onDidDismiss={() => setDateOpen(false)}
            className="ops-date-modal"
          >
            <div className="ops-date-picker">
              <div className="ops-date-picker__modes" role="tablist" aria-label={t('ops.selectDate')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={dateMode === 'today'}
                  className={dateMode === 'today' ? 'active' : ''}
                  onClick={pickToday}
                >
                  {t('ops.dateToday')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={dateMode === 'range'}
                  className={dateMode === 'range' ? 'active' : ''}
                  onClick={pickRangeMode}
                >
                  {t('ops.dateRange')}
                </button>
              </div>

              <div className="ops-date-picker__selection" aria-live="polite">
                {dateMode === 'today' || !dateEnd || dateEnd === dateStart
                  ? formatOpsDate(dateStart)
                  : `${formatOpsDate(dateStart)} — ${formatOpsDate(dateEnd)}`}
              </div>

              <IonDatetime
                presentation="date"
                locale="es-PE"
                value={dateEnd ?? dateStart}
                highlightedDates={dateMode === 'range' ? highlightedOperationDates : []}
                max={localIsoDate(new Date())}
                onIonChange={(event) => selectOperationDate(event.detail.value)}
              />

              <button
                className="ops-date-picker__apply"
                type="button"
                onClick={() => setDateOpen(false)}
              >
                {t('ops.dateApply')}
              </button>
            </div>
          </IonModal>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default OperationsPage;
