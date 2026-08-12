import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonDatetime, IonIcon, IonModal, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import type { ScrollDetail } from '@ionic/react';
import { peopleOutline, receiptOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { ContactCard } from '../components/ContactCard';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailSheet } from '../components/OrderDetailSheet';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useViewport } from '../hooks/useViewport';
import { CHATS_PATH, OPERATIONS_PATH } from '../navigation/navConfig';
import { setChatNavFrom } from '../navigation/chatNavFrom';
import { apiFacade } from '../services/apiFacade';
import type { ContactInfo, FunnelStage } from '../types/contact';
import type { KanbanGroup, KanbanSubState, Order } from '../types';
import { getKanbanGroup, getKanbanSubState } from '../utils/orderKanban';
import { groupContactsByFunnel } from '../utils/funnelStage';
import { sortOpsQueue } from '../utils/opsQueue';

type OpsMode = 'funnel' | 'orders';
type OpsFocus = KanbanGroup;
type OpsSubFilter = 'all' | KanbanSubState;
type FunnelFocus = FunnelStage;

const NEW_SUBSTATES: KanbanSubState[] = ['pre_order', 'accepted'];
const PROCESSING_SUBSTATES: KanbanSubState[] = ['in_kitchen', 'ready', 'on_the_way'];
const FUNNEL_FOCI: FunnelFocus[] = ['INICIAL', 'PIDIENDO', 'HUMANO', 'CON_PEDIDO'];

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
  const { brand, orders, loading, setOrdersFilters, showToast } = useApp();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const pageRef = useRef<HTMLElement>(null);

  const [opsMode, setOpsMode] = useState<OpsMode>('funnel');
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFocus, setActiveFocus] = useState<OpsFocus>('new');
  const [subFilter, setSubFilter] = useState<OpsSubFilter>('all');
  const [funnelFocus, setFunnelFocus] = useState<FunnelFocus>('INICIAL');
  const [dateOpen, setDateOpen] = useState(false);
  const [dateStart, setDateStart] = useState(() => localIsoDate(new Date()));
  const [dateEnd, setDateEnd] = useState<string | null>(null);
  const [dateClicks, setDateClicks] = useState(0);
  const [dateMode, setDateMode] = useState<'today' | 'range'>('today');
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const searchBootstrapped = useRef(false);

  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const contactsRequestId = useRef(0);
  const contactsCacheRef = useRef(new Map<string, ContactInfo[]>());

  const loadContacts = useCallback(
    async (search?: string) => {
      const subdomain = brand?.subdomain?.trim();
      if (!subdomain) {
        setContacts([]);
        return;
      }
      const normalizedSearch = search?.trim().toLowerCase() || '';
      const cacheKey = `${subdomain}|${normalizedSearch}`;
      const cached = contactsCacheRef.current.get(cacheKey);
      if (cached) {
        setContacts(cached);
        setContactsLoading(false);
      }
      const requestId = ++contactsRequestId.current;
      if (!cached) setContactsLoading(true);
      try {
        const result = await apiFacade.listContacts({
          subDomain: subdomain,
          page: 1,
          limit: 150,
          search: search?.trim() || undefined,
        });
        if (requestId !== contactsRequestId.current) return;
        contactsCacheRef.current.set(cacheKey, result.data);
        setContacts(result.data);
      } catch {
        if (requestId === contactsRequestId.current) {
          if (cached) {
            setContacts(cached);
          } else {
            setContacts([]);
            showToast('ops.funnel.loadError');
          }
        }
      } finally {
        if (requestId === contactsRequestId.current) {
          setContactsLoading(false);
        }
      }
    },
    [brand?.subdomain, showToast],
  );

  useEffect(() => {
    if (opsMode !== 'funnel') return;
    void loadContacts(query);
  }, [opsMode, brand?.subdomain, loadContacts]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const search = query.trim();
      if (!searchBootstrapped.current) {
        searchBootstrapped.current = true;
        if (!search) return;
      }
      if (opsMode === 'orders') {
        void setOrdersFilters({ search: search || undefined });
      } else {
        void loadContacts(search);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query, opsMode, setOrdersFilters, loadContacts]);

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

  const selectFunnelFocus = (focus: FunnelFocus) => {
    setFunnelFocus(focus);
    setVisibleCount(6);
  };

  const switchMode = (mode: OpsMode) => {
    setOpsMode(mode);
    setVisibleCount(6);
    searchBootstrapped.current = false;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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

  const groupedContacts = useMemo(() => groupContactsByFunnel(contacts), [contacts]);

  const funnelQueue = useMemo(
    () => groupedContacts[funnelFocus] ?? [],
    [groupedContacts, funnelFocus],
  );

  const visibleOrderItems = queueItems.slice(0, visibleCount);
  const visibleContacts = funnelQueue.slice(0, visibleCount);
  const currentQueueLength = opsMode === 'funnel' ? funnelQueue.length : queueItems.length;

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleCount >= currentQueueLength) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((current) => Math.min(current + 6, currentQueueLength));
        }
      },
      { rootMargin: '0px 0px 160px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentQueueLength, visibleCount]);

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
    if (order.phone?.trim()) {
      go(`${CHATS_PATH}?phone=${encodeURIComponent(order.phone.trim())}`);
      return;
    }
    go(`${CHATS_PATH}?customer=${encodeURIComponent(order.customerKey)}`);
  };

  const openContactChat = (contact: ContactInfo) => {
    const params = new URLSearchParams();
    if (contact._id) params.set('agentStateId', contact._id);
    if (contact.clientPhone?.trim()) params.set('phone', contact.clientPhone.trim());
    if (!params.toString()) {
      showToast('ops.funnel.chatComingSoon');
      return;
    }
    setChatNavFrom(OPERATIONS_PATH);
    go(`${CHATS_PATH}?${params.toString()}`);
  };

  const listLoading = opsMode === 'funnel' ? contactsLoading : loading;
  const emptyKey = opsMode === 'funnel' ? 'ops.funnel.queueEmpty' : 'ops.queueEmpty';
  const queueLen = opsMode === 'funnel' ? funnelQueue.length : queueItems.length;

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
            <div className="ops-view-switch ag-enter" role="tablist" aria-label={t('ops.modeAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={opsMode === 'funnel'}
                className={opsMode === 'funnel' ? 'active' : ''}
                onClick={() => switchMode('funnel')}
              >
                {t('ops.mode.funnel')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={opsMode === 'orders'}
                className={opsMode === 'orders' ? 'active' : ''}
                onClick={() => switchMode('orders')}
              >
                {t('ops.mode.orders')}
              </button>
            </div>

            {opsMode === 'orders' ? (
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
            ) : null}

            <div className="ops-sticky-controls ag-enter">
              <IonSearchbar
                className="ops-search"
                value={query}
                onIonInput={(e) => setQuery(e.detail.value ?? '')}
                placeholder={
                  opsMode === 'funnel' ? t('ops.funnel.search') : t('ops.search')
                }
                debounce={200}
              />
            </div>

            {opsMode === 'funnel' ? (
              <>
                <div
                  className="ops-summary ops-summary--funnel ag-enter"
                  role="tablist"
                  aria-label={t('ops.funnel.focusAria')}
                >
                  {FUNNEL_FOCI.map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      role="tab"
                      aria-selected={funnelFocus === stage}
                      aria-pressed={funnelFocus === stage}
                      className={`ops-summary-card ops-summary-card--funnel-${stage.toLowerCase()}${funnelFocus === stage ? ' active' : ''}`}
                      onClick={() => selectFunnelFocus(stage)}
                    >
                      <strong>{groupedContacts[stage].length}</strong>
                      <span>{t(`ops.funnel.stages.${stage}`)}</span>
                    </button>
                  ))}
                </div>

                <section
                  className="ops-queue ag-enter"
                  aria-label={t('ops.queueAria', {
                    focus: t(`ops.funnel.stages.${funnelFocus}`),
                  })}
                >
                  <header className="ops-queue__head">
                    <h2>{t(`ops.funnel.stages.${funnelFocus}`)}</h2>
                    <span className="kanban-count">{funnelQueue.length}</span>
                  </header>

                  <div className="ops-queue__cards">
                    {listLoading ? (
                      <div className="module-loading">
                        <IonSpinner name="crescent" />
                      </div>
                    ) : (
                      visibleContacts.map((contact) => (
                        <ContactCard
                          key={contact._id}
                          contact={contact}
                          onClick={() => openContactChat(contact)}
                          onChat={() => openContactChat(contact)}
                        />
                      ))
                    )}
                  </div>

                  {!listLoading && funnelQueue.length === 0 ? (
                    <div className="ops-empty-state" role="status">
                      <IonIcon icon={peopleOutline} aria-hidden="true" />
                      <p>{t(emptyKey)}</p>
                    </div>
                  ) : null}

                  {visibleCount < queueLen ? <div ref={loadMoreSentinelRef} className="ops-scroll-sentinel" aria-hidden="true" /> : null}
                </section>
              </>
            ) : (
              <>
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
                    {listLoading ? (
                      <div className="module-loading">
                        <IonSpinner name="crescent" />
                      </div>
                    ) : (
                      visibleOrderItems.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onClick={() => setSelectedOrder(order)}
                          onChat={() => openOrderChat(order)}
                        />
                      ))
                    )}
                  </div>

                  {!listLoading && queueItems.length === 0 ? (
                    <div className="ops-empty-state" role="status">
                      <IonIcon icon={receiptOutline} aria-hidden="true" />
                      <p>{t(emptyKey)}</p>
                    </div>
                  ) : null}

                  {visibleCount < queueItems.length ? <div ref={loadMoreSentinelRef} className="ops-scroll-sentinel" aria-hidden="true" /> : null}
                </section>
              </>
            )}
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
