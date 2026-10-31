import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner, useIonViewDidEnter } from '@ionic/react';
import type { ScrollDetail } from '@ionic/react';
import { calendarOutline, peopleOutline, receiptOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { DispatchQueue } from './motorized/DispatchQueue';
import { OperationsQuickAccess } from '../components/OperationsQuickAccess';
import { OperationsFilters, type FunnelChannel, type OperationsPanel, type OperationsScopeResult, type ReservationDateChoice, type ReservationStatusFilter } from '../components/OperationsFilters';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { ContactCard } from '../components/ContactCard';
import { ReservationCard } from '../components/ReservationCard';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailSheet } from '../components/OrderDetailSheet';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { TRIP_PATH } from '../navigation/motorizedScreens';
import { useViewport } from '../hooks/useViewport';
import { CHATS_PATH, OPERATIONS_PATH } from '../navigation/navConfig';
import { setChatNavFrom } from '../navigation/chatNavFrom';
import { apiFacade } from '../services/apiFacade';
import type { ContactInfo, FunnelStage } from '../types/contact';
import type { KanbanGroup, KanbanSubState, Order } from '../types';
import { getKanbanGroup, getKanbanSubState } from '../utils/orderKanban';
import { useOperationsConversations } from '../hooks/useOperationsConversations';
import { sortOpsQueue } from '../utils/opsQueue';
import { orderConversationPath } from '../utils/orderConversation';
import { readOperationsView, writeOperationsView, operationsViewGeneration } from '../navigation/operationsViewState';
import { contactAttentionLocation } from '../utils/contactPresentation';
import { canNavigate } from '../navigation/navigationAccess';
import { appendPage } from '../services/listPage';
import { currentReservationWeek, type MadeReservation } from '../services/reservationService';

type OpsMode = 'funnel' | 'orders' | 'reservations';
type OpsFocus = KanbanGroup;
type OpsSubFilter = 'all' | KanbanSubState;
type FunnelFocus = FunnelStage;

const NEW_SUBSTATES: KanbanSubState[] = ['pre_order', 'accepted'];
const PROCESSING_SUBSTATES: KanbanSubState[] = ['in_kitchen', 'ready', 'on_the_way'];
const FUNNEL_FOCI: FunnelFocus[] = ['INICIAL', 'PIDIENDO', 'HUMANO', 'CON_PEDIDO'];

const FOCUS_LABEL_KEY: Record<OpsFocus, string> = {
  new: 'ops.kanbanNew',
  processing: 'ops.kanbanProcessing',
  delivered: 'ops.kanbanDelivered',
};

const OperationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { session, brand, authEpoch, orders, ordersFilters, ordersError, canChangeOrders, orderMutations, advanceOrder, ordersHasMore, ordersLoadingMore, loadMoreOrders, refreshOrders, loading, setOrdersFilters, showToast } = useApp();
  const { go, replace } = useAppNavigation();
  const { isTablet } = useViewport();
  const pageRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLIonContentElement>(null);
  const viewScope = `${authEpoch}|${brand?.id}`;
  const initialView = useRef(readOperationsView(viewScope)).current;
  const viewGeneration = useRef(operationsViewGeneration()).current;
  const scrollPosition = useRef(initialView?.scrollTop ?? 0);

  const [scopeContext, setScopeContext] = useState<OperationsScopeResult | null>(null);
  const verifiedScope = scopeContext?.scope === `${authEpoch}|${brand?.id}|${brand?.subdomain}` ? scopeContext : null;
  const scopedBranches = verifiedScope?.data?.branches ?? [];
  const [opsMode, setOpsMode] = useState<OpsMode>(initialView?.mode ?? 'funnel');
  const [query, setQuery] = useState(initialView?.query ?? ordersFilters.search ?? '');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(() => orders.find(order => order.id === initialView?.selectedOrderId) ?? null);
  const [activeFocus, setActiveFocus] = useState<OpsFocus>(initialView?.focus ?? 'new');
  const [subFilter, setSubFilter] = useState<OpsSubFilter>(initialView?.subFilter ?? 'all');
  const [funnelFocus, setFunnelFocus] = useState<FunnelFocus>(initialView?.funnelFocus ?? 'INICIAL');
  const [detailSuspended, setDetailSuspended] = useState(false);
  const pendingDetailChat = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pendingDetailChat.current = null; }; }, []);
  const [panel, setPanel] = useState<OperationsPanel | null>(null);
  const [funnelChannel, setFunnelChannel] = useState<FunnelChannel>('all');
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [visibleCount, setVisibleCount] = useState(initialView?.visibleCount ?? 6);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const detailReturnFocus = useRef<HTMLElement | null>(null);
  const searchBootstrapped = useRef(false);

  const previousBranch = useRef(ordersFilters.branchId);
  const conversations = useOperationsConversations({subDomain: brand?.subdomain?.trim() ?? '', branchId: ordersFilters.branchId,
    channel: funnelChannel === 'all' ? undefined : funnelChannel, search: query.trim() || undefined},
    `${authEpoch}|${brand?.id}`, opsMode === 'funnel' && Boolean(brand?.subdomain) && Boolean(session && ['owner', 'manager', 'worker', 'superadmin'].includes(session.role)));
  const loadContacts = useCallback((_search?: string, more = false) => {
    if (more) conversations.loadMore(funnelFocus);
    else conversations.refresh();
  }, [conversations.loadMore, conversations.refresh, funnelFocus]);
  const [reservationStatus, setReservationStatus] = useState<ReservationStatusFilter>('all');
  const [reservationDateMode, setReservationDateMode] = useState<ReservationDateChoice>('week');
  const [reservationRange, setReservationRange] = useState(() => currentReservationWeek());
  const [reservationResult, setReservationResult] = useState<{ scope: string; data: MadeReservation[] }>({ scope: '', data: [] });
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState(false);
  const [reservationsHasMore, setReservationsHasMore] = useState(false);
  const [reservationsLoadingMore, setReservationsLoadingMore] = useState(false);
  const reservationsPage = useRef(1);
  const reservationsRequestId = useRef(0);
  const reservationsBusy = useRef(false);
  const reservationScope = `${authEpoch}|${brand?.id}|${brand?.subdomain}|${ordersFilters.branchId ?? ''}|${funnelChannel}|${reservationStatus}|${query.trim()}|${reservationRange.dateFrom}|${reservationRange.dateTo}`;
  const reservationScopeRef = useRef(reservationScope);
  reservationScopeRef.current = reservationScope;
  const reservations = useMemo(() => reservationResult.scope === reservationScope ? reservationResult.data : [], [reservationResult, reservationScope]);
  const reservationsRef = useRef(reservations);
  reservationsRef.current = reservations;

  const loadReservations = useCallback(async (search?: string, more = false) => {
    const subdomain = brand?.subdomain?.trim();
    if (!subdomain || (more && reservationsBusy.current)) return;
    const scope = reservationScopeRef.current;
    const requestId = ++reservationsRequestId.current;
    reservationsBusy.current = true;
    setReservationsError(false);
    if (more) setReservationsLoadingMore(true);
    else {
      setReservationsLoading(true);
      setReservationResult({ scope, data: [] });
      setReservationsHasMore(false);
    }
    try {
      const page = more ? reservationsPage.current + 1 : 1;
      const result = await apiFacade.listReservations({
        brandSubdomain: subdomain,
        ...reservationRange,
        branchId: ordersFilters.branchId,
        search: search?.trim() || undefined,
        status: reservationStatus === 'all' ? undefined : reservationStatus,
        sourceChannel: funnelChannel === 'all' ? undefined : funnelChannel,
        page,
        limit: 30,
      });
      if (requestId !== reservationsRequestId.current || scope !== reservationScopeRef.current) return;
      if (more && result.data.length > 0 && !result.data.some(item => !reservationsRef.current.some(old => old.id === item.id))) {
        throw new Error('Pagination made no progress');
      }
      setReservationResult(previous => ({
        scope,
        data: more ? appendPage(previous.data, result.data, item => item.id) : result.data,
      }));
      reservationsPage.current = page;
      setReservationsHasMore(result.hasMore);
    } catch {
      if (requestId === reservationsRequestId.current && scope === reservationScopeRef.current) {
        setReservationResult({ scope, data: [] });
        setReservationsHasMore(false);
        setReservationsError(true);
      }
    } finally {
      if (requestId === reservationsRequestId.current) {
        reservationsBusy.current = false;
        setReservationsLoading(false);
        setReservationsLoadingMore(false);
      }
    }
  }, [brand?.subdomain, ordersFilters.branchId, reservationRange, reservationStatus, funnelChannel]);

  // Invalidate requests/caches immediately when auth, brand or branch changes.
  useEffect(() => {
    if (previousBranch.current !== ordersFilters.branchId) setSelectedOrder(null);
    previousBranch.current = ordersFilters.branchId;
  }, [authEpoch, brand?.id, ordersFilters.branchId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const search = query.trim();
      if (!searchBootstrapped.current) {
        searchBootstrapped.current = true;
        if (!search && opsMode === 'orders') return;
      }
      if (opsMode === 'orders') {
        void setOrdersFilters({ search: search || undefined });
      } else if (opsMode === 'reservations') {
        void loadReservations(search);
      }
      // Funnel search/filter changes are handled by its scoped live query.
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query, opsMode, setOrdersFilters, loadReservations, authEpoch, brand?.id]);

  useEffect(() => {
    const reconnect = () => {
      if (opsMode === 'funnel') void loadContacts(query);
      else if (opsMode === 'reservations') void loadReservations(query);
      else void refreshOrders();
    };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [opsMode, query, loadContacts, loadReservations, refreshOrders]);

  useEffect(() => {
    const state = { mode: opsMode, query, focus: activeFocus, subFilter, funnelFocus, visibleCount,
      selectedOrderId: selectedOrder?.id, scrollTop: scrollPosition.current };
    writeOperationsView(viewScope, state, viewGeneration);
    return () => writeOperationsView(viewScope, { ...state, scrollTop: scrollPosition.current }, viewGeneration);
  }, [viewScope, viewGeneration, opsMode, query, activeFocus, subFilter, funnelFocus, visibleCount, selectedOrder?.id]);
  useIonViewDidEnter(() => {
    if (!pendingDetailChat.current) setDetailSuspended(false);
    const top = readOperationsView(viewScope)?.scrollTop ?? scrollPosition.current;
    if (isTablet) {
      const main = pageRef.current?.querySelector('.ag-app-shell-main');
      if (main) main.scrollTop = top;
    } else void contentRef.current?.scrollToPoint(0, top, 0);
  });
  const applyScrollTop = (nextScrollTopRaw: number) => {
    const nextScrollTop = Math.max(0, nextScrollTopRaw);
    scrollPosition.current = nextScrollTop;
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
    setPanel(current => {
      if (mode === 'funnel' && (current === 'date' || current === 'status')) return null;
      if (mode === 'orders' && current === 'status') return null;
      return current;
    });
  };

  const filtered = useMemo(() => {
    if (loading || ordersError || query.trim() !== (ordersFilters.search ?? '')) return [];
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.toLowerCase().includes(q) ||
        t(o.customerKey).toLowerCase().includes(q),
    );
  }, [orders, query, t, loading, ordersError, ordersFilters.search]);

  const groups = useMemo(
    () => ({
      new: filtered.filter((o) => getKanbanGroup(o.status) === 'new'),
      processing: filtered.filter((o) => getKanbanGroup(o.status) === 'processing'),
      delivered: filtered.filter((o) => getKanbanGroup(o.status) === 'delivered'),
    }),
    [filtered],
  );

  const inFocus = useMemo(() => groups[activeFocus], [groups, activeFocus]);

  const queueItems = useMemo(() => {
    const scoped =
      subFilter === 'all' ? inFocus : inFocus.filter((order) => getKanbanSubState(order) === subFilter);
    return sortOpsQueue(scoped);
  }, [inFocus, subFilter]);

  const groupedContacts = useMemo(() => Object.fromEntries(FUNNEL_FOCI.map(stage => [stage, conversations.columns[stage].items])) as Record<FunnelStage, ContactInfo[]>, [conversations.columns]);

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

  const openOrderChat = (order: Order) => {
    const path = orderConversationPath(order);
    if (!path) {
      showToast('ops.reliability.chatUnavailable');
      return;
    }
    setChatNavFrom(OPERATIONS_PATH);
    go(path);
  };

  useEffect(() => {
    if (session?.role === 'rider') replace(TRIP_PATH);
  }, [session?.role, replace]);

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

  const listLoading = opsMode === 'funnel'
    ? conversations.loading
    : opsMode === 'reservations'
      ? reservationsLoading || reservationResult.scope !== reservationScope
      : loading || query.trim() !== (ordersFilters.search ?? '');
  const listError = opsMode === 'funnel'
    ? conversations.error
    : opsMode === 'reservations'
      ? reservationsError && reservationResult.scope === reservationScope
      : ordersError && query.trim() === (ordersFilters.search ?? '');
  const hasMore = opsMode === 'funnel' ? conversations.columns[funnelFocus].hasMore : opsMode === 'reservations' ? reservationsHasMore : ordersHasMore;
  const loadingMore = opsMode === 'funnel' ? conversations.loadingMore : opsMode === 'reservations' ? reservationsLoadingMore : ordersLoadingMore;
  const emptyKey = query.trim() ? 'ops.reliability.noMatches' : opsMode === 'funnel' ? 'ops.funnel.queueEmpty' : opsMode === 'reservations' ? 'ops.reservations.empty' : 'ops.queueEmpty';
  const queueLen = opsMode === 'funnel' ? funnelQueue.length : queueItems.length;

  if (session?.role === 'rider') return null;
  if (session?.role === 'motorized') return <DispatchQueue />;

  return (
    <IonPage data-ag-route="/app/operations"
      ref={pageRef}
      className={`operations-page${isPageScrolled ? ' operations-page--scrolled' : ''}${isScrollingUp ? ' operations-page--scroll-up' : ' operations-page--scroll-down'}`}
    >
      <IonContent
        ref={contentRef}
        className="ag-screen"
        scrollEvents={!isTablet}
        onIonScroll={isTablet ? undefined : handleOperationsScroll}
      >
        <AppShell>
          <AppHeader title={t('ops.title')} trailing={
            <OperationsQuickAccess mode={opsMode} query={query} onQueryChange={setQuery} panel={panel} onPanel={setPanel} branchCount={verifiedScope?.state === 'ready' ? scopedBranches.length : undefined}>
              <OperationsFilters panel={panel} onClose={() => setPanel(null)} mode={opsMode} onScopeChange={setScopeContext} funnelChannel={funnelChannel} onFunnelChannel={setFunnelChannel} reservationStatus={reservationStatus} onReservationStatus={setReservationStatus} reservationDateMode={reservationDateMode} reservationRange={reservationRange} onReservationDate={(choice, range) => { setReservationDateMode(choice); setReservationRange(range); }} />
            </OperationsQuickAccess>
          } />
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
              <button
                type="button"
                role="tab"
                aria-selected={opsMode === 'reservations'}
                className={opsMode === 'reservations' ? 'active' : ''}
                onClick={() => switchMode('reservations')}
              >
                {t('ops.mode.reservations')}
              </button>
            </div>

            {listError ? (
              <section className="ops-service-error" role="alert">
                <h2>{t('ops.reliability.unavailable')}</h2>
                <p>{t('ops.reliability.retryDescription')}</p>
                <button type="button" className="ag-btn ag-btn--primary" onClick={() => {
                  if (opsMode === 'funnel') void loadContacts(query);
                  else if (opsMode === 'reservations') void loadReservations(query);
                  else void refreshOrders();
                }}>{t('ops.reliability.retry')}</button>
              </section>
            ) : opsMode === 'funnel' ? (
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
                      <strong>{listLoading ? '—' : (conversations.columns[stage].total ?? '—')}</strong>
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
                    <span className="kanban-count">{listLoading ? '—' : (conversations.columns[funnelFocus].total ?? '—')}</span>
                  </header>

                  <div className="ops-queue__cards">
                    {listLoading ? (
                      <div className="module-loading" role="status" aria-label={t('ops.filters.loading')}>
                        <IonSpinner name="crescent" />
                      </div>
                    ) : (
                      visibleContacts.map((contact) => (
                        <ContactCard
                          key={contact._id}
                          contact={contact}
                          attentionLocation={contactAttentionLocation(contact, verifiedScope?.data)}
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
            ) : opsMode === 'orders' ? (
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
                    <strong>{listLoading ? '—' : groups.new.length}</strong>
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
                    <strong>{listLoading ? '—' : groups.processing.length}</strong>
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
                    <strong>{listLoading ? '—' : groups.delivered.length}</strong>
                    <span>{t('ops.kanbanDelivered')}</span>
                  </button>
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
                    <span className="kanban-count">{listLoading ? '—' : queueItems.length}</span>
                  </header>

                  <div className="ops-queue__cards">
                    {listLoading ? (
                      <div className="module-loading" role="status" aria-label={t('ops.filters.loading')}>
                        <IonSpinner name="crescent" />
                      </div>
                    ) : (
                      visibleOrderItems.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          brand={brand}
                          showBranch={!ordersFilters.branchId && (brand?.locations ?? 0) > 1}
                          canChangeStatus={canChangeOrders}
                          mutation={orderMutations[order.id]}
                          onAdvance={() => advanceOrder(order.id, order.status)}
                          onClick={() => {
                            detailReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                            setSelectedOrder(order);
                          }}
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
            ) : (
              <section className="ops-queue ag-enter" aria-label={t('ops.reservations.queueAria')}>
                  <header className="ops-queue__head">
                    <h2>{t('ops.reservations.range', { from: reservationRange.dateFrom, to: reservationRange.dateTo })}</h2>
                    <span className="kanban-count">{listLoading ? '—' : reservations.length}</span>
                  </header>
                  <div className="ops-queue__cards">
                    {listLoading ? (
                      <div className="module-loading" role="status" aria-label={t('ops.filters.loading')}>
                        <IonSpinner name="crescent" />
                      </div>
                    ) : reservations.map((reservation) => (
                      <ReservationCard key={reservation.id} reservation={reservation} />
                    ))}
                  </div>
                  {!listLoading && reservations.length === 0 ? (
                    <div className="ops-empty-state" role="status">
                      <IonIcon icon={calendarOutline} aria-hidden="true" />
                      <p>{t(emptyKey)}</p>
                    </div>
                  ) : null}
                </section>
            )}
            {!listError && !listLoading && hasMore ? (
              <button type="button" className="ag-btn ops-load-more" disabled={loadingMore} onClick={() => {
                if (opsMode === 'funnel') void loadContacts(query, true);
                else if (opsMode === 'reservations') void loadReservations(query, true);
                else void loadMoreOrders();
              }}>{t(loadingMore ? 'ops.reliability.loadingMore' : 'ops.reliability.loadMore')}</button>
            ) : null}
          </div>

          <OrderDetailSheet
            order={ordersError ? null : orders.find(item => item.id === selectedOrder?.id) ?? selectedOrder}
            open={!ordersError && !!selectedOrder && !detailSuspended}
            onChat={canNavigate(session, CHATS_PATH) && selectedOrder ? () => {
              const path = orderConversationPath(selectedOrder);
              if (!path) { showToast('ops.reliability.chatUnavailable'); return; }
              pendingDetailChat.current = path;
              setDetailSuspended(true);
            } : undefined}
            onClose={() => {
              if (!mounted.current) return;
              const destination = pendingDetailChat.current;
              if (destination) {
                pendingDetailChat.current = null;
                setChatNavFrom(OPERATIONS_PATH);
                go(destination);
                return;
              }
              setDetailSuspended(false);
              setSelectedOrder(null);
              const target = detailReturnFocus.current;
              if (target?.isConnected) target.focus({ preventScroll: true });
            }}
          />

        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default OperationsPage;
