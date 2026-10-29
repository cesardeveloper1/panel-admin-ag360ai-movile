import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Brand, NotificationItem, Order, UserSession } from '../types';
import { apiFacade } from '../services/apiFacade';
import { orderService } from '../services/orderService';
import {
  defaultOrdersFilters,
  type OrdersListFilters,
} from '../services/ordersQuery';
import { mergeConfirmedOrder, nextOrderAction, type OrderActionResult, type OrderMutation } from '../utils/orderActions';
import { appendPage } from '../services/listPage';
import { clearChatInboxCache } from '../services/chatInboxState';
import { nextNavigationIntent } from '../navigation/navigationIntent';
import { clearOperationsViews } from '../navigation/operationsViewState';
import { clearChatNavFrom } from '../navigation/chatNavFrom';
import { isFleetPhoneRole } from '../navigation/motorizedScreens';
import { AppContext } from './appContextInstance';
import { onSessionExpired } from '../utils/authSession';
import { paymentNotificationCapture } from '../native/paymentNotificationCapture';
import { App as CapacitorApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { refreshAccessToken } from '../services/api';
import {
  getAuthToken,
  getTokenExpirationMs,
  notifySessionExpired,
} from '../utils/authSession';

export const BRAND_KEY = 'ag360-brand-id';
export const PICK_BRAND_KEY = 'ag360-pick-brand';
export const ONBOARDING_PREFIX = 'ag360-onboarding-';
const DARK_KEY = 'ag360-dark';
const AGENT_KEY = 'ag360-agent-enabled';
const ACCESS_TOKEN_REFRESH_ADVANCE_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_RETRY_MS = 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_483_647;

function readDarkMode() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DARK_KEY) === 'true';
}

function readAgentEnabled() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(AGENT_KEY) === 'true';
}

function resetAuthStorage() {
  nextNavigationIntent();
  clearOperationsViews();
  clearChatInboxCache();
  clearChatNavFrom();
  void apiFacade.logout();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(BRAND_KEY);
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(PICK_BRAND_KEY);
    sessionStorage.removeItem('ag360-session');
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [session, setSession] = useState<UserSession | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [authRestoring, setAuthRestoring] = useState(true);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState(false);
  const [ordersLastSyncedAt, setOrdersLastSyncedAt] = useState<number | null>(null);
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
  const ordersPage = useRef(1);
  const ordersMoreBusy = useRef(false);
  const [ordersFilters, setOrdersFiltersState] = useState<OrdersListFilters>(defaultOrdersFilters);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandTransitioning, setBrandTransitioning] = useState(false);
  const [kitchenMode, setKitchenMode] = useState(false);
  const [darkMode, setDarkModeState] = useState(readDarkMode);
  const [agentEnabled, setAgentEnabled] = useState(readAgentEnabled);
  const [agentLocked, setAgentLocked] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authEpoch, setAuthEpoch] = useState(0);

  const ordersRequestId = useRef(0);
  const brandSelectionId = useRef(0);
  const notificationsRequestId = useRef(0);
  const brandSelectPromise = useRef<Promise<boolean> | null>(null);
  // En desarrollo, StrictMode vuelve a ejecutar el efecto de montaje. Ambas
  // ejecuciones deben compartir la misma rotación del refresh token.
  const restoreSessionPromise = useRef<Promise<UserSession | null> | null>(null);
  const brandTransitionTimer = useRef<number | null>(null);
  const ordersFiltersRef = useRef(ordersFilters);
  ordersFiltersRef.current = ordersFilters;

  const [orderMutations, setOrderMutations] = useState<Record<string, OrderMutation>>({});
  const mutationTasks = useRef(new Map<string, Promise<OrderActionResult>>());
  const mutationSequence = useRef(0);
  const mutationScopeVersion = useRef(0);
  const confirmedOrders = useRef(new Map<string, { scope: string; sequence: number; order: Order }>());
  const orderScope = `${authEpoch}|${brand?.id}|${ordersFilters.branchId ?? ''}`;
  const orderScopeRef = useRef(orderScope);
  orderScopeRef.current = orderScope;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const canChangeOrders = Boolean(session?.capabilities?.changeOrderStatus && brand && !ordersError);
  const canChangeOrdersRef = useRef(canChangeOrders);
  canChangeOrdersRef.current = canChangeOrders;
  const authEpochRef = useRef(authEpoch);
  authEpochRef.current = authEpoch;

  useEffect(() => {
    mutationScopeVersion.current += 1;
    setOrderMutations({});
    mutationTasks.current.clear();
    confirmedOrders.current.clear();
  }, [orderScope]);

  useEffect(() => {
    let active = true;
    if (!restoreSessionPromise.current) {
      restoreSessionPromise.current = apiFacade.restoreSession();
    }

    void restoreSessionPromise.current
      .then((restored) => {
        if (active && restored) setSession(restored);
      })
      .finally(() => {
        if (active) setAuthRestoring(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('ion-palette-dark', darkMode);
    localStorage.setItem(DARK_KEY, String(darkMode));
  }, [darkMode]);

  const showToast = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      setToast(t(key, params));
      window.setTimeout(() => setToast(null), 2200);
    },
    [t],
  );

  useEffect(() => {
    return onSessionExpired(() => {
      nextNavigationIntent();
      clearOperationsViews();
      clearChatInboxCache();
      clearChatNavFrom();
      void paymentNotificationCapture.unlinkDevice().catch(() => undefined);
      brandSelectionId.current += 1;
      ordersRequestId.current += 1;
      brandSelectPromise.current = null;
      flushSync(() => {
        setSession(null);
        setBrand(null);
        setOrders([]);
        setOrdersError(false);
        setOrdersHasMore(false);
        setOrdersLastSyncedAt(null);
        setOrdersLoadingMore(false);
        setKitchenMode(false);
        setBrandLoading(false);
        setLoading(false);
        setAuthEpoch((n) => n + 1);
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(BRAND_KEY);
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(PICK_BRAND_KEY);
        sessionStorage.removeItem('ag360-session');
      }
      showToast('toast.sessionExpired');
    });
  }, [showToast]);

  useEffect(() => {
    if (!session) return;

    let stopped = false;
    let refreshInFlight = false;
    let timeoutId: number | undefined;
    let appStateHandle: PluginListenerHandle | undefined;

    const clearScheduledRefresh = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    const scheduleRefresh = (delayOverride?: number) => {
      clearScheduledRefresh();
      if (stopped) return;
      const expiresAt = getTokenExpirationMs(getAuthToken());
      if (!expiresAt) return;
      const delay = delayOverride ?? Math.max(
        0,
        expiresAt - Date.now() - ACCESS_TOKEN_REFRESH_ADVANCE_MS,
      );
      timeoutId = window.setTimeout(
        () => void refreshSession(),
        Math.min(delay, MAX_TIMEOUT_MS),
      );
    };

    const refreshSession = async () => {
      if (stopped || refreshInFlight) return;
      refreshInFlight = true;
      try {
        const result = await refreshAccessToken();
        if (stopped) return;
        if (result === 'unauthorized') {
          notifySessionExpired();
          return;
        }
        scheduleRefresh(
          result === 'refreshed' ? undefined : ACCESS_TOKEN_REFRESH_RETRY_MS,
        );
      } finally {
        refreshInFlight = false;
      }
    };

    const refreshIfNeeded = () => {
      const expiresAt = getTokenExpirationMs(getAuthToken());
      if (expiresAt && expiresAt <= Date.now() + ACCESS_TOKEN_REFRESH_ADVANCE_MS) {
        void refreshSession();
        return;
      }
      scheduleRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfNeeded();
    };

    scheduleRefresh();
    window.addEventListener('online', refreshIfNeeded);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) refreshIfNeeded();
    }).then((handle) => {
      if (stopped) void handle.remove();
      else appStateHandle = handle;
    });

    return () => {
      stopped = true;
      clearScheduledRefresh();
      window.removeEventListener('online', refreshIfNeeded);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void appStateHandle?.remove();
    };
  }, [session]);

  const loadOrdersForBrand = useCallback(
    async (nextBrand: Brand, filters?: OrdersListFilters, preserve = false): Promise<Order[]> => {
      const requestId = ++ordersRequestId.current;
      const resolved = filters ?? ordersFiltersRef.current;
      const startedSequence = mutationSequence.current;
      const scope = `${authEpochRef.current}|${nextBrand.id}|${resolved.branchId ?? ''}`;
      setOrdersError(false);
      if (!preserve) {
        setOrdersLastSyncedAt(null);
        setOrders([]);
        setOrdersHasMore(false);
      }
      setOrdersLoadingMore(false);
      ordersMoreBusy.current = false;
      try {
        const result = await apiFacade.getOrdersPage(nextBrand, { ...resolved, page: 1 });
        if (requestId !== ordersRequestId.current) return [];
        ordersPage.current = 1;
        const reconciled = result.data.map(order => {
          const confirmed = confirmedOrders.current.get(order.id);
          return confirmed?.scope === scope && confirmed.sequence > startedSequence
            ? mergeConfirmedOrder(order, confirmed.order) : order;
        });
        setOrders(reconciled);
        setOrdersLastSyncedAt(Date.now());
        setOrdersHasMore(result.hasMore);
        return result.data;
      } catch {
        if (requestId === ordersRequestId.current) {
          setOrders([]);
          setOrdersError(true);
          setOrdersHasMore(false);
        }
        return [];
      } finally {
        if (requestId === ordersRequestId.current) setLoading(false);
      }
    },
    [],
  );

  const refreshNotifications = useCallback(async (brandId: string) => {
    const requestId = ++notificationsRequestId.current;
    try {
      const data = await apiFacade.getNotifications(brandId);
      if (requestId === notificationsRequestId.current) setNotifications(data);
    } catch {
      if (requestId === notificationsRequestId.current) setNotifications([]);
    }
  }, []);

  const loadMotorizedOrders = useCallback(async (preserve = false) => {
    const requestId = ++ordersRequestId.current;
    const resolved = ordersFiltersRef.current;
    setOrdersError(false);
    if (!preserve) {
      setOrdersLastSyncedAt(null);
      setOrders([]);
      setOrdersHasMore(false);
    }
    try {
      const result = await apiFacade.getMotorizedOrdersPage({ ...resolved, page: 1 });
      if (requestId !== ordersRequestId.current) return;
      ordersPage.current = 1;
      setOrders(result.data);
      setOrdersLastSyncedAt(Date.now());
      setOrdersHasMore(result.hasMore);
    } catch {
      if (requestId === ordersRequestId.current) {
        setOrders([]);
        setOrdersError(true);
        setOrdersHasMore(false);
      }
    } finally {
      if (requestId === ordersRequestId.current) setLoading(false);
    }
  }, []);

  const refreshOrders = useCallback(async () => {
    if (isFleetPhoneRole(sessionRef.current?.role)) {
      if (!ordersRef.current.length) setLoading(true);
      await loadMotorizedOrders(true);
      return;
    }
    if (!brand) return;
    if (!ordersRef.current.length) setLoading(true);
    try {
      await loadOrdersForBrand(brand, ordersFiltersRef.current, true);
    } catch {
      showToast('toast.ordersLoadError');
    }
  }, [brand, loadMotorizedOrders, loadOrdersForBrand, showToast]);

  useEffect(() => {
    if (!isFleetPhoneRole(session?.role)) return;
    setLoading(true);
    void loadMotorizedOrders();
  }, [session?.role, authEpoch, loadMotorizedOrders]);

  const setOrdersFilters = useCallback(
    async (patch: Partial<OrdersListFilters>) => {
      const next: OrdersListFilters = {
        ...ordersFiltersRef.current,
        ...patch,
      };
      if (next.dateMode === 'today' || next.dateMode === 'range') {
        const from = next.dateFrom ?? defaultOrdersFilters().dateFrom;
        next.dateFrom = from;
        next.dateTo = next.dateTo ?? from;
      }
      ordersFiltersRef.current = next;
      setOrdersFiltersState(next);

      if (isFleetPhoneRole(sessionRef.current?.role)) {
        setLoading(true);
        await loadMotorizedOrders();
        return;
      }
      if (!brand) return;
      setLoading(true);
      try {
        await loadOrdersForBrand(brand, next);
      } catch {
        showToast('toast.ordersLoadError');
      }
    },
    [brand, loadMotorizedOrders, loadOrdersForBrand, showToast],
  );

  const loadMoreOrders = useCallback(async () => {
    if (!brand || !ordersHasMore || ordersMoreBusy.current || loading || ordersError) return;
    const requestId = ordersRequestId.current;
    ordersMoreBusy.current = true;
    setOrdersLoadingMore(true);
    try {
      const result = await apiFacade.getOrdersPage(brand, {
        ...ordersFiltersRef.current, page: ordersPage.current + 1,
      });
      if (requestId !== ordersRequestId.current) return;
      if (result.data.length > 0 && !result.data.some(item => !orders.some(old => old.id === item.id))) {
        throw new Error('Pagination made no progress');
      }
      setOrders(previous => appendPage(previous, result.data, item => item.id));
      setOrdersLastSyncedAt(Date.now());
      ordersPage.current = result.page;
      setOrdersHasMore(result.hasMore);
    } catch {
      if (requestId === ordersRequestId.current) {
        setOrders([]);
        setOrdersHasMore(false);
        setOrdersError(true);
      }
    } finally {
      if (requestId === ordersRequestId.current) {
        ordersMoreBusy.current = false;
        setOrdersLoadingMore(false);
      }
    }
  }, [brand, orders, ordersHasMore, loading, ordersError]);

  const syncAgentForBrand = useCallback(async (nextBrand: Brand) => {
    const subdomain = nextBrand.subdomain?.trim();
    if (!subdomain) {
      setAgentLocked(false);
      return;
    }
    setAgentBusy(true);
    try {
      const state = await apiFacade.getBotState(subdomain);
      setAgentEnabled(state.isOn);
      setAgentLocked(state.lockedBySuperadmin);
      localStorage.setItem(AGENT_KEY, String(state.isOn));
    } catch {
      // Soft-fail: conservar toggle local
    } finally {
      setAgentBusy(false);
    }
  }, []);

  const clearBrand = useCallback(() => {
    nextNavigationIntent();
    clearOperationsViews();
    clearChatInboxCache();
    clearChatNavFrom();
    brandSelectionId.current += 1;
    ordersRequestId.current += 1;
    notificationsRequestId.current += 1;
    brandSelectPromise.current = null;
    setBrand(null);
    setOrders([]);
    setOrdersError(false);
    setOrdersLastSyncedAt(null);
    setOrdersHasMore(false);
    setOrdersLoadingMore(false);
    setNotifications([]);
    const resetFilters = defaultOrdersFilters();
    ordersFiltersRef.current = resetFilters;
    setOrdersFiltersState(resetFilters);
    setKitchenMode(false);
    setBrandLoading(false);
    setLoading(false);
    setAgentLocked(false);
    setAgentBusy(false);
    localStorage.removeItem(BRAND_KEY);
  }, []);

  const prepareBrandPick = useCallback(() => {
    sessionStorage.setItem(PICK_BRAND_KEY, '1');
  }, []);

  const startBrandSwitch = useCallback(() => {
    if (brandTransitionTimer.current !== null) {
      window.clearTimeout(brandTransitionTimer.current);
    }
    flushSync(() => setBrandTransitioning(true));
    void paymentNotificationCapture.unlinkDevice().catch(() => undefined);
    brandSelectionId.current += 1;
    ordersRequestId.current += 1;
    brandSelectPromise.current = null;
    prepareBrandPick();
    clearBrand();
    setAuthEpoch((n) => n + 1);
    brandTransitionTimer.current = window.setTimeout(() => {
      setBrandTransitioning(false);
      brandTransitionTimer.current = null;
    }, 1400);
  }, [clearBrand, prepareBrandPick]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const user = await apiFacade.login(email, password);
        if (!user) return false;
        brandSelectionId.current += 1;
        ordersRequestId.current += 1;
        brandSelectPromise.current = null;
        sessionStorage.removeItem(PICK_BRAND_KEY);
        flushSync(() => {
          setSession(user);
          clearBrand();
          setAuthEpoch((n) => n + 1);
        });
        showToast('toast.loginOk');
        return true;
      } catch {
        return false;
      } finally {
        setLoading(false);
      }
    },
    [clearBrand, showToast],
  );

  const logout = useCallback(() => {
    const role = sessionRef.current?.role;
    const finish = () => {
      void paymentNotificationCapture.unlinkDevice().catch(() => undefined);
      brandSelectionId.current += 1;
      ordersRequestId.current += 1;
      notificationsRequestId.current += 1;
      brandSelectPromise.current = null;
      flushSync(() => {
        setSession(null);
        setBrand(null);
        setOrders([]);
        setOrdersError(false);
        setOrdersLastSyncedAt(null);
        setOrdersHasMore(false);
        setOrdersLoadingMore(false);
        setNotifications([]);
        setKitchenMode(false);
        setBrandLoading(false);
        setLoading(false);
        setAuthEpoch((n) => n + 1);
      });
      resetAuthStorage();
    };
    if (role === 'rider') {
      void orderService.setFleetPresence('logged_out').catch(() => undefined).finally(finish);
      return;
    }
    finish();
  }, []);

  const selectBrandAndLoad = useCallback(
    async (next: Brand) => {
      if (!session) return false;
      if (brandSelectPromise.current) return brandSelectPromise.current;

      const run = (async () => {
        nextNavigationIntent();
        clearOperationsViews();
        clearChatInboxCache();
        clearChatNavFrom();
        const selectionId = ++brandSelectionId.current;
        try {
          setBrandLoading(true);
          setBrand(next);
          setOrders([]);
          setSession((prev) => (prev ? { ...prev, brandId: next.id } : prev));
          localStorage.setItem(BRAND_KEY, next.id);
          sessionStorage.removeItem(PICK_BRAND_KEY);

          // Filters belong to the selected brand; never reuse another brand's local IDs.
          const initialFilters = defaultOrdersFilters(new Date(), next.timezone);
          ordersFiltersRef.current = initialFilters;
          setOrdersFiltersState(initialFilters);
          setLoading(true);
          await loadOrdersForBrand(next, initialFilters);
          // loadOrdersForBrand owns request sequencing; brand/session changes invalidate it.
          if (brandSelectionId.current !== selectionId) return false;
          setBrandLoading(false);

          void syncAgentForBrand(next);
          void refreshNotifications(next.id);
          return true;
        } catch {
          if (selectionId === brandSelectionId.current) {
            setBrand(null);
            setOrders([]);
            localStorage.removeItem(BRAND_KEY);
            setBrandLoading(false);
            showToast('toast.ordersLoadError');
          }
          return false;
        } finally {
          if (selectionId === brandSelectionId.current) {
            setBrandLoading(false);
          }
        }
      })();

      brandSelectPromise.current = run;
      try {
        return await run;
      } finally {
        if (brandSelectPromise.current === run) brandSelectPromise.current = null;
      }
    },
    [loadOrdersForBrand, refreshNotifications, session, showToast, syncAgentForBrand],
  );

  const setDarkMode = useCallback((value: boolean) => {
    setDarkModeState(value);
  }, []);

  const toggleAgent = useCallback(async () => {
    if (agentBusy) return;
    if (agentLocked) {
      showToast('agent.locked');
      return;
    }

    const subdomain = brand?.subdomain?.trim();
    if (!subdomain || apiFacade.useMock) {
      setAgentEnabled((current) => {
        const next = !current;
        localStorage.setItem(AGENT_KEY, String(next));
        return next;
      });
      return;
    }

    const previous = agentEnabled;
    const next = !previous;
    setAgentEnabled(next);
    setAgentBusy(true);
    try {
      const state = await apiFacade.setBotEnabled(subdomain, next);
      setAgentEnabled(state.isOn);
      setAgentLocked(state.lockedBySuperadmin);
      localStorage.setItem(AGENT_KEY, String(state.isOn));
      showToast(state.isOn ? 'agent.activated' : 'agent.deactivated');
    } catch {
      setAgentEnabled(previous);
      showToast('agent.updateError');
    } finally {
      setAgentBusy(false);
    }
  }, [agentBusy, agentEnabled, agentLocked, brand?.subdomain, showToast]);

  const completeOnboarding = useCallback(() => {
    if (!brand) return;
    localStorage.setItem(`${ONBOARDING_PREFIX}${brand.id}`, '1');
  }, [brand]);

  const isOnboardingDone = useCallback((brandId: string) => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(`${ONBOARDING_PREFIX}${brandId}`) === '1';
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    const notification = notifications.find((item) => item.id === id);
    if (!notification?.unread) return;

    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, unread: false } : item)));
    try {
      await apiFacade.markNotificationRead(id);
    } catch {
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, unread: true } : item)));
      showToast('toast.notificationsUpdateError');
    }
  }, [notifications, showToast]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!brand) return;
    const unreadIds = new Set(notifications.filter((item) => item.unread).map((item) => item.id));
    if (unreadIds.size === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
    try {
      await apiFacade.markAllNotificationsRead(brand.id);
    } catch {
      setNotifications((prev) => prev.map((item) => (unreadIds.has(item.id) ? { ...item, unread: true } : item)));
      showToast('toast.notificationsUpdateError');
    }
  }, [brand, notifications, showToast]);

  const advanceOrder = useCallback((orderId: string, expectedStatus?: Order['status']): Promise<OrderActionResult> => {
    const pending = mutationTasks.current.get(orderId);
    if (pending) return pending;
    const order = ordersRef.current.find(item => item.id === orderId);
    const scope = orderScopeRef.current;
    const scopeVersion = mutationScopeVersion.current;
    const isCurrent = () => scope === orderScopeRef.current && scopeVersion === mutationScopeVersion.current;
    if (!brand || !order || order.brandId !== brand.id || !canChangeOrdersRef.current) {
      return Promise.resolve({ ok: false, reason: 'denied' });
    }
    const action = nextOrderAction(order, true);
    if (!action || (expectedStatus && order.status !== expectedStatus)) {
      return Promise.resolve({ ok: false, reason: 'conflict' });
    }
    setOrderMutations(previous => ({ ...previous, [orderId]: { pending: true } }));
    const publish = (confirmed: Order) => {
      if (!isCurrent()) return;
      confirmedOrders.current.set(orderId, { scope, sequence: ++mutationSequence.current, order: confirmed });
      setOrders(previous => previous.map(item => item.id === orderId ? mergeConfirmedOrder(item, confirmed) : item));
    };
    const task = (async (): Promise<OrderActionResult> => {
      try {
        const current = await apiFacade.getOrderDetail(brand, order);
        if (!isCurrent()) return { ok: false, reason: 'stale' };
        const currentAction = nextOrderAction(current, canChangeOrdersRef.current);
        if (!currentAction || current.status !== order.status || currentAction.next !== action.next || current.deliveryType !== order.deliveryType) {
          publish(current);
          setOrderMutations(previous => ({ ...previous, [orderId]: { pending: false, errorKey: 'ops.actions.changed' } }));
          return { ok: false, reason: 'conflict' };
        }
        await apiFacade.updateOrderStatus(orderId, action.next, current.orderNumber);
        if (!isCurrent()) return { ok: false, reason: 'stale' };
        const confirmed = await apiFacade.getOrderDetail(brand, current);
        if (!isCurrent()) return { ok: false, reason: 'stale' };
        publish(confirmed);
        const latest = ordersRef.current.find(item => item.id === orderId);
        const effective = latest ? mergeConfirmedOrder(latest, confirmed) : confirmed;
        if (effective.status !== action.next) {
          setOrderMutations(previous => ({ ...previous, [orderId]: { pending: false, errorKey: 'ops.actions.changed' } }));
          return { ok: false, reason: 'conflict' };
        }
        setOrderMutations(previous => ({ ...previous, [orderId]: { pending: false } }));
        showToast('toast.orderUpdated');
        return { ok: true, order: effective };
      } catch {
        if (!isCurrent()) return { ok: false, reason: 'stale' };
        setOrderMutations(previous => ({ ...previous, [orderId]: { pending: false, errorKey: 'ops.actions.failed' } }));
        return { ok: false, reason: 'failed' };
      } finally {
        if (isCurrent()) mutationTasks.current.delete(orderId);
      }
    })();
    mutationTasks.current.set(orderId, task);
    return task;
  }, [brand, showToast]);

  const setMotorizedOrderStatus = useCallback(async (orderId: string, status: Order['status']): Promise<OrderActionResult> => {
    const allowed = status === 'in_kitchen' || status === 'on_the_way' || status === 'delivered' || status === 'cancelled';
    const order = ordersRef.current.find((item) => item.id === orderId);
    if (sessionRef.current?.role !== 'motorized' || !allowed || !order) {
      return { ok: false, reason: 'denied' };
    }
    try {
      await apiFacade.updateOrderStatus(orderId, status, order.orderNumber);
      await loadMotorizedOrders(true);
      showToast('toast.orderUpdated');
      return { ok: true, order: { ...order, status } };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  }, [loadMotorizedOrders, showToast]);

  const setRiderOrderStatus = useCallback(async (orderId: string, status: Order['status']): Promise<OrderActionResult> => {
    const order = ordersRef.current.find((item) => item.id === orderId);
    const allowed = status === 'on_the_way' || (status === 'delivered' && order?.status === 'on_the_way');
    if (sessionRef.current?.role !== 'rider' || !allowed || !order) {
      return { ok: false, reason: 'denied' };
    }
    try {
      await apiFacade.updateOrderStatus(orderId, status, order.orderNumber);
      await loadMotorizedOrders(true);
      showToast('toast.orderUpdated');
      return { ok: true, order: { ...order, status } };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  }, [loadMotorizedOrders, showToast]);

  const value = useMemo(
    () => ({
      session,
      authRestoring,
      brand,
      orders,
      ordersError,
      ordersLastSyncedAt,
      ordersHasMore,
      ordersLoadingMore,
      loadMoreOrders,
      ordersFilters,
      notifications,
      loading,
      brandLoading,
      brandTransitioning,
      kitchenMode,
      darkMode,
      agentEnabled,
      agentLocked,
      agentBusy,
      authEpoch,
      login,
      logout,
      clearBrand,
      prepareBrandPick,
      startBrandSwitch,
      selectBrandAndLoad,
      refreshOrders,
      setOrdersFilters,
      advanceOrder,
      setMotorizedOrderStatus,
      setRiderOrderStatus,
      canChangeOrders,
      orderMutations,
      setKitchenMode,
      setDarkMode,
      toggleAgent,
      toast,
      showToast,
      completeOnboarding,
      isOnboardingDone,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [
      session,
      authRestoring,
      brand,
      orders,
      ordersError,
      ordersLastSyncedAt,
      ordersHasMore,
      ordersLoadingMore,
      loadMoreOrders,
      ordersFilters,
      notifications,
      loading,
      brandLoading,
      brandTransitioning,
      kitchenMode,
      darkMode,
      agentEnabled,
      agentLocked,
      agentBusy,
      authEpoch,
      login,
      logout,
      clearBrand,
      prepareBrandPick,
      startBrandSwitch,
      selectBrandAndLoad,
      refreshOrders,
      setOrdersFilters,
      advanceOrder,
      setMotorizedOrderStatus,
      setRiderOrderStatus,
      canChangeOrders,
      orderMutations,
      setDarkMode,
      toggleAgent,
      toast,
      showToast,
      completeOnboarding,
      isOnboardingDone,
      markNotificationRead,
      markAllNotificationsRead,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

