import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonDatetime, IonIcon, IonModal, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import type { ScrollDetail } from '@ionic/react';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailSheet } from '../components/OrderDetailSheet';
import { useApp } from '../context/AppContext';
import { getKanbanGroup, getKanbanSubState } from '../utils/orderKanban';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import { CHATS_PATH, OPERATIONS_PATH } from '../navigation/navConfig';
import { setChatNavFrom } from '../navigation/chatNavFrom';
import type { KanbanGroup, KanbanSubState, Order } from '../types';
import { sortOpsQueue } from '../utils/opsQueue';

type OpsFocus = KanbanGroup;
type OpsSubFilter = 'all' | KanbanSubState;

const NEW_SUBSTATES: KanbanSubState[] = ['starting', 'ordering', 'human'];
const PROCESSING_SUBSTATES: KanbanSubState[] = ['in_kitchen', 'ready', 'on_the_way'];

const OPS_SEGMENT_COLORS = {
  new: 'var(--ag-pulse)',
  processing: 'var(--ag-hot)',
  delivered: 'var(--ag-done)',
} as const;

const FOCUS_LABEL_KEY: Record<OpsFocus, string> = {
  new: 'ops.kanbanNew',
  processing: 'ops.kanbanProcessing',
  delivered: 'ops.kanbanDelivered',
};

const localIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const OperationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { orders, loading, setOrdersFilters } = useApp();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const pageRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFocus, setActiveFocus] = useState<OpsFocus>('new');
  const [subFilter, setSubFilter] = useState<OpsSubFilter>('all');
  const [dateOpen, setDateOpen] = useState(false);
  const [dateStart, setDateStart] = useState(() => localIsoDate(new Date()));
  const [dateEnd, setDateEnd] = useState<string | null>(null);
  const [dateClicks, setDateClicks] = useState(0);
  const [dateMode, setDateMode] = useState<'today' | 'range'>('today');
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const lastScrollTopRef = useRef(0);
  const searchBootstrapped = useRef(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const search = query.trim();
      if (!searchBootstrapped.current) {
        searchBootstrapped.current = true;
        if (!search) return;
      }
      void setOrdersFilters({ search: search || undefined });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query, setOrdersFilters]);

  const applyOrdersDateFilters = useCallback(() => {
    const today = localIsoDate(new Date());
    const end = dateEnd ?? dateStart;
    const isTodayOnly = dateMode === 'today' || (!dateEnd && dateStart === today);
    void setOrdersFilters({
      dateMode: isTodayOnly ? 'today' : 'range',
      dateFrom: dateStart,
      dateTo: end,
      search: query.trim() || undefined,
    });
    setDateOpen(false);
  }, [dateEnd, dateMode, dateStart, query, setOrdersFilters]);

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

  const selectFocus = (focus: OpsFocus) => {
    setActiveFocus(focus);
    setSubFilter('all');
    setVisibleCount(6);
  };

  const selectSubFilter = (next: OpsSubFilter) => {
    setSubFilter(next);
    setVisibleCount(6);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Fecha viene del servidor (setOrdersFilters); search local como refuerzo inmediato.
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
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

  const inFocus = useMemo(() => groups[activeFocus], [groups, activeFocus]);

  const queueItems = useMemo(() => {
    const scoped =
      subFilter === 'all' ? inFocus : inFocus.filter((order) => getKanbanSubState(order) === subFilter);
    return sortOpsQueue(scoped);
  }, [inFocus, subFilter]);

  const visibleItems = queueItems.slice(0, visibleCount);

  const subChips: KanbanSubState[] =
    activeFocus === 'new' ? NEW_SUBSTATES : activeFocus === 'processing' ? PROCESSING_SUBSTATES : [];

  const highlightedOperationDates = useMemo(() => {
    const end = dateEnd ?? dateStart;
    const cursor = new Date(`${dateStart}T12:00:00`);
    const last = new Date(`${end}T12:00:00`);
    const dates = [];
    while (cursor <= last) {
      const date = localIsoDate(cursor);
      const boundary = date === dateStart || date === end;
      dates.push({
        date,
        textColor: boundary ? '#ffffff' : '#5f2fc5',
        backgroundColor: boundary ? '#8746ff' : 'rgba(135, 70, 255, 0.16)',
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [dateStart, dateEnd]);

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
    setChatNavFrom(OPERATIONS_PATH);
    go(`${CHATS_PATH}?customer=${encodeURIComponent(order.customerKey)}`);
  };

  return (
    <IonPage
      ref={pageRef}
      className={`operations-page${isPageScrolled ? ' operations-page--scrolled' : ''}${isScrollingUp ? ' operations-page--scroll-up' : ' operations-page--scroll-down'}`}
    >
      <IonContent
        className="ag-screen"
        scrollEvents={!isTablet}
        onIonScroll={isTablet ? undefined : handleOperationsScroll}
      >
        <AppShell>
          <AppHeader centeredCompact title={t('ops.title')} showAlerts />
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
              <IonSearchbar
                className="ops-search"
                value={query}
                onIonInput={(e) => setQuery(e.detail.value ?? '')}
                placeholder={t('ops.search')}
                debounce={200}
              />
            </div>

            <div
              className="ops-summary ag-enter"
              role="tablist"
              aria-label={t('ops.focusAria')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeFocus === 'new'}
                aria-pressed={activeFocus === 'new'}
                className={`ops-summary-card ops-summary-card--new${activeFocus === 'new' ? ' active' : ''}`}
                onClick={() => selectFocus('new')}
              >
                <strong>{groups.new.length}</strong>
                <span>{t('ops.kanbanNew')}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFocus === 'processing'}
                aria-pressed={activeFocus === 'processing'}
                className={`ops-summary-card ops-summary-card--hot${activeFocus === 'processing' ? ' active' : ''}`}
                onClick={() => selectFocus('processing')}
              >
                <strong>{groups.processing.length}</strong>
                <span>{t('ops.kanbanProcessing')}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeFocus === 'delivered'}
                aria-pressed={activeFocus === 'delivered'}
                className={`ops-summary-card ops-summary-card--done${activeFocus === 'delivered' ? ' active' : ''}`}
                onClick={() => selectFocus('delivered')}
              >
                <strong>{groups.delivered.length}</strong>
                <span>{t('ops.kanbanDelivered')}</span>
              </button>
            </div>

            <div className="ops-proportion ag-enter" aria-hidden={proportionTotal === 0}>
              <div
                className="ops-proportion-bar"
                role="group"
                aria-label={t('ops.proportionAria', { total: proportionTotal })}
              >
                {proportionTotal > 0 ? (
                  proportionSegments.map((seg) =>
                    seg.count > 0 ? (
                      <button
                        key={seg.id}
                        type="button"
                        className={`ops-proportion-segment ops-proportion-segment--btn${activeFocus === seg.id ? ' is-active' : ''}`}
                        style={{
                          flex: seg.count,
                          background: OPS_SEGMENT_COLORS[seg.id],
                        }}
                        title={`${seg.label}: ${seg.count}`}
                        aria-label={`${seg.label}: ${seg.count}`}
                        aria-pressed={activeFocus === seg.id}
                        onClick={() => selectFocus(seg.id)}
                      />
                    ) : null,
                  )
                ) : (
                  <span className="ops-proportion-segment ops-proportion-segment--empty" />
                )}
              </div>
            </div>

            {subChips.length > 0 ? (
              <div
                className="ops-subfilter ag-enter"
                role="tablist"
                aria-label={t(FOCUS_LABEL_KEY[activeFocus])}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={subFilter === 'all'}
                  className={subFilter === 'all' ? 'active' : ''}
                  onClick={() => selectSubFilter('all')}
                >
                  {t('ops.allView')}
                </button>
                {subChips.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    role="tab"
                    aria-selected={subFilter === sub}
                    className={subFilter === sub ? 'active' : ''}
                    onClick={() => selectSubFilter(sub)}
                  >
                    {t(`ops.subStates.${sub}`)}
                  </button>
                ))}
              </div>
            ) : null}

            <section
              className="ops-queue ag-enter"
              aria-label={t('ops.queueAria', { focus: t(FOCUS_LABEL_KEY[activeFocus]) })}
            >
              <header className="ops-queue__head">
                <h2>
                  {subFilter === 'all'
                    ? t(FOCUS_LABEL_KEY[activeFocus])
                    : t(`ops.subStates.${subFilter}`)}
                </h2>
                <span className="kanban-count">{queueItems.length}</span>
              </header>

              <div className="ops-queue__cards">
                {loading ? (
                  <div className="module-loading">
                    <IonSpinner name="crescent" />
                  </div>
                ) : (
                  visibleItems.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                      onChat={() => openOrderChat(order)}
                    />
                  ))
                )}
              </div>

              {!loading && queueItems.length === 0 ? (
                <p className="kanban-empty">{t('ops.queueEmpty')}</p>
              ) : null}

              {visibleCount > 6 || visibleCount < queueItems.length ? (
                <div className="ops-load-controls">
                  {visibleCount > 6 ? (
                    <button
                      type="button"
                      className="ops-load-more"
                      aria-label={t('ops.collapseThree')}
                      onClick={() => setVisibleCount((n) => Math.max(6, n - 3))}
                    >
                      <IonIcon icon={chevronUpOutline} />
                    </button>
                  ) : null}
                  {visibleCount < queueItems.length ? (
                    <button
                      type="button"
                      className="ops-load-more"
                      aria-label={t('ops.showThreeMore')}
                      onClick={() => setVisibleCount((n) => n + 3)}
                    >
                      <IonIcon icon={chevronDownOutline} />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>

          <OrderDetailSheet
            order={selectedOrder}
            open={!!selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />

          <IonModal isOpen={dateOpen} onDidDismiss={() => setDateOpen(false)} className="ops-date-modal">
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

              <button className="ops-date-picker__apply" type="button" onClick={applyOrdersDateFilters}>
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
