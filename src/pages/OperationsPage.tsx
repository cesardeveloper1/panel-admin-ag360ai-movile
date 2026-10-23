import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSearchbar, IonSpinner } from '@ionic/react';
import type { ScrollDetail } from '@ionic/react';
import { peopleOutline, receiptOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { OperationsQuickAccess } from '../components/OperationsQuickAccess';
import { OperationsFilters, type OperationsScopeResult } from '../components/OperationsFilters';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { ContactCard } from '../components/ContactCard';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailSheet } from '../components/OrderDetailSheet';
import { useApp } from '../hooks/useApp';
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
import { orderConversationPath } from '../utils/orderConversation';
import { appendPage } from '../services/listPage';

type OpsMode = 'funnel' | 'orders';
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
  const { brand, authEpoch, orders, ordersFilters, ordersError, ordersLastSyncedAt, canChangeOrders, orderMutations, advanceOrder, ordersHasMore, ordersLoadingMore, loadMoreOrders, refreshOrders, loading, setOrdersFilters, showToast } = useApp();
  const { go } = useAppNavigation();
  const { isTablet } = useViewport();
  const pageRef = useRef<HTMLElement>(null);

  const [scopeContext, setScopeContext] = useState<OperationsScopeResult | null>(null);
  const verifiedScope = scopeContext?.scope === `${authEpoch}|${brand?.id}|${brand?.subdomain}` ? scopeContext : null;
  const scopedBranches = verifiedScope?.data?.branches ?? [];
  const localContext = verifiedScope?.state === 'error' ? t('ops.filters.contextError') : verifiedScope?.state !== 'ready' ? t('ops.filters.loading') :
    scopedBranches.length === 0 ? t('ops.filters.noLocals') : scopedBranches.length === 1 ? scopedBranches[0].name :
      scopedBranches.find(branch => branch.id === ordersFilters.branchId)?.name ?? t('ops.filters.allLocals');
  const [opsMode, setOpsMode] = useState<OpsMode>('funnel');
  const [query, setQuery] = useState(ordersFilters.search ?? '');
  useEffect(() => { setQuery(''); setDateOpen(false); }, [authEpoch, brand?.id]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeFocus, setActiveFocus] = useState<OpsFocus>('new');
  const [subFilter, setSubFilter] = useState<OpsSubFilter>('all');
  const [funnelFocus, setFunnelFocus] = useState<FunnelFocus>('INICIAL');
  const [dateOpen, setDateOpen] = useState(false);
  const [isPageScrolled, setIsPageScrolled] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const [visibleCount, setVisibleCount] = useState(6);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const detailReturnFocus = useRef<HTMLElement | null>(null);
  const searchBootstrapped = useRef(false);

  const [contactResult, setContactResult] = useState<{ scope: string; data: ContactInfo[]; syncedAt?: number }>({ scope: '', data: [] });
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(false);
  const [contactsHasMore, setContactsHasMore] = useState(false);
  const [contactsLoadingMore, setContactsLoadingMore] = useState(false);
  const contactsPage = useRef(1);
  const contactsRequestId = useRef(0);
  const contactsBusy = useRef(false);
  const contactsScope = `${authEpoch}|${brand?.id}|${brand?.subdomain}|${ordersFilters.branchId ?? ''}|${query.trim()}`;
  const contactsScopeRef = useRef(contactsScope);
  contactsScopeRef.current = contactsScope;
  const contacts = useMemo(() => contactResult.scope === contactsScope ? contactResult.data : [], [contactResult, contactsScope]);
  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  const loadContacts = useCallback(async (search?: string, more = false) => {
    const subdomain = brand?.subdomain?.trim();
    if (!subdomain || (more && contactsBusy.current)) return;
    const scope = contactsScopeRef.current;
    const requestId = ++contactsRequestId.current;
    contactsBusy.current = true;
    setContactsError(false);
    if (more) setContactsLoadingMore(true);
    else {
      setContactsLoading(true);
      setContactResult({ scope, data: [] });
      setContactsHasMore(false);
    }
    try {
      const page = more ? contactsPage.current + 1 : 1;
      const result = await apiFacade.listContacts({ subDomain: subdomain, page, limit: 150,
        branchId: ordersFilters.branchId, search: search?.trim() || undefined });
      if (requestId !== contactsRequestId.current || scope !== contactsScopeRef.current) return;
      const pagination = result.meta.pagination;
      const hasMore = pagination?.hasNextPage ?? result.data.length >= 150;
      if (more && result.data.length > 0 && !result.data.some(item => !contactsRef.current.some(old => old._id === item._id))) {
        throw new Error('Pagination made no progress');
      }
      setContactResult(previous => ({ scope, syncedAt: Date.now(),
        data: more ? appendPage(previous.data, result.data, item => item._id) : result.data }));
      contactsPage.current = page;
      setContactsHasMore(hasMore);
    } catch {
      if (requestId === contactsRequestId.current && scope === contactsScopeRef.current) {
        setContactResult({ scope, data: [] });
        setContactsHasMore(false);
        setContactsError(true);
      }
    } finally {
      if (requestId === contactsRequestId.current) {
        contactsBusy.current = false;
        setContactsLoading(false);
        setContactsLoadingMore(false);
      }
    }
  }, [brand?.subdomain, ordersFilters.branchId]);

  // Invalidate requests/caches immediately when auth, brand or branch changes.
  useEffect(() => {
    contactsRequestId.current += 1;
    contactsBusy.current = false;
    setContactResult({ scope: '', data: [] });
    setContactsError(false);
    setContactsHasMore(false);
    setContactsLoadingMore(false);
    setSelectedOrder(null);
    return () => { contactsRequestId.current += 1; };
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
      } else {
        void loadContacts(search);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query, opsMode, setOrdersFilters, loadContacts, authEpoch, brand?.id]);

  useEffect(() => {
    const reconnect = () => {
      if (opsMode === 'funnel') void loadContacts(query);
      else void refreshOrders();
    };
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, [opsMode, query, loadContacts, refreshOrders]);

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

  const openOrderChat = (order: Order) => {
    setChatNavFrom(OPERATIONS_PATH);
    const path = orderConversationPath(order);
    if (!path) {
      showToast('ops.reliability.chatUnavailable');
      return;
    }
    go(path);
  };

  useEffect(() => {
    if (ordersError) setSelectedOrder(null);
  }, [ordersError]);

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

  const listLoading = opsMode === 'funnel' ? contactsLoading || contactResult.scope !== contactsScope : loading || query.trim() !== (ordersFilters.search ?? '');
  const listError = opsMode === 'funnel' ? contactsError && contactResult.scope === contactsScope : ordersError && query.trim() === (ordersFilters.search ?? '');
  const hasMore = opsMode === 'funnel' ? contactsHasMore : ordersHasMore;
  const loadingMore = opsMode === 'funnel' ? contactsLoadingMore : ordersLoadingMore;
  const emptyKey = query.trim() ? 'ops.reliability.noMatches' : opsMode === 'funnel' ? 'ops.funnel.queueEmpty' : 'ops.queueEmpty';
  const lastSyncedAt = opsMode === 'funnel' ? contactResult.syncedAt : ordersLastSyncedAt;
  const syncedTime = lastSyncedAt ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(lastSyncedAt) : null;
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
          <AppHeader title={t('ops.title')} subtitle={brand?.displayName} trailing={<OperationsQuickAccess onFilters={() => setDateOpen(true)} />} />
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

            <p className="ops-applied-context"><span aria-hidden="true">{verifiedScope?.state === 'ready' && scopedBranches.length === 0 ? '⌖̸ ' : ''}</span>{localContext}</p>
            {opsMode === 'orders' ? <p className="ops-applied-context">{t(`ops.filters.${ordersFilters.dateMode}`)}{ordersFilters.source ? ` · ${ordersFilters.source === 2 ? t('ops.filters.digitalMenu') : ({ 1: 'WhatsApp', 5: 'Instagram', 6: 'Messenger' } as Record<number, string>)[ordersFilters.source]}` : ''}</p> : null}

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

            {!listError && !listLoading ? <p className="ops-loaded-note">{t('ops.reliability.loadedCounts')}{syncedTime ? ` · ${t('ops.reliability.syncedAt', { time: syncedTime })}` : ''}</p> : null}
            {listError ? (
              <section className="ops-service-error" role="alert">
                <h2>{t('ops.reliability.unavailable')}</h2>
                <p>{t('ops.reliability.retryDescription')}</p>
                <button type="button" className="ag-btn ag-btn--primary" onClick={() => {
                  if (opsMode === 'funnel') void loadContacts(query);
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
            )}
            {!listError && !listLoading && hasMore ? (
              <button type="button" className="ag-btn ops-load-more" disabled={loadingMore} onClick={() => {
                if (opsMode === 'funnel') void loadContacts(query, true);
                else void loadMoreOrders();
              }}>{t(loadingMore ? 'ops.reliability.loadingMore' : 'ops.reliability.loadMore')}</button>
            ) : null}
          </div>

          <OrderDetailSheet
            order={ordersError ? null : orders.find(item => item.id === selectedOrder?.id) ?? selectedOrder}
            open={!ordersError && !!selectedOrder}
            onClose={() => {
              setSelectedOrder(null);
              const target = detailReturnFocus.current;
              if (target?.isConnected) target.focus({ preventScroll: true });
            }}
          />

          <OperationsFilters onScopeChange={setScopeContext} open={dateOpen} onClose={() => setDateOpen(false)} mode={opsMode} />
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default OperationsPage;
