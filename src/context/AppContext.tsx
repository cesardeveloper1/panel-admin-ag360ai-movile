import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Brand, NotificationItem, Order, UserSession } from '../types';
import { apiFacade } from '../services/apiFacade';
import { apiMock } from '../services/apiMock';
import {
  defaultOrdersFilters,
  type OrdersListFilters,
} from '../services/ordersQuery';
import { onSessionExpired } from '../utils/authSession';

export const BRAND_KEY = 'ag360-brand-id';
export const PICK_BRAND_KEY = 'ag360-pick-brand';
export const ONBOARDING_PREFIX = 'ag360-onboarding-';
const DARK_KEY = 'ag360-dark';
const AGENT_KEY = 'ag360-agent-enabled';

interface AppContextValue {
  session: UserSession | null;
  brand: Brand | null;
  orders: Order[];
  ordersFilters: OrdersListFilters;
  notifications: NotificationItem[];
  loading: boolean;
  brandLoading: boolean;
  brandTransitioning: boolean;
  kitchenMode: boolean;
  darkMode: boolean;
  agentEnabled: boolean;
  authEpoch: number;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearBrand: () => void;
  prepareBrandPick: () => void;
  startBrandSwitch: () => void;
  selectBrandAndLoad: (brand: Brand) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  /** Actualiza filtros de listado y refetch (fecha / search). */
  setOrdersFilters: (patch: Partial<OrdersListFilters>) => Promise<void>;
  advanceOrder: (orderId: string) => void;
  setKitchenMode: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  toggleAgent: () => void;
  toast: string | null;
  showToast: (key: string, params?: Record<string, string | number>) => void;
  completeOnboarding: () => void;
  isOnboardingDone: (brandId: string) => boolean;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function readDarkMode() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(DARK_KEY) === 'true';
}

function readAgentEnabled() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(AGENT_KEY) === 'true';
}

function resetAuthStorage() {
  apiFacade.logout();
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
  const [brand, setBrand] = useState<Brand | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersFilters, setOrdersFiltersState] = useState<OrdersListFilters>(defaultOrdersFilters);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandTransitioning, setBrandTransitioning] = useState(false);
  const [kitchenMode, setKitchenMode] = useState(false);
  const [darkMode, setDarkModeState] = useState(readDarkMode);
  const [agentEnabled, setAgentEnabled] = useState(readAgentEnabled);
  const [toast, setToast] = useState<string | null>(null);
  const [authEpoch, setAuthEpoch] = useState(0);

  const ordersRequestId = useRef(0);
  const brandSelectPromise = useRef<Promise<boolean> | null>(null);
  const brandTransitionTimer = useRef<number | null>(null);
  const ordersFiltersRef = useRef(ordersFilters);
  ordersFiltersRef.current = ordersFilters;

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
      ordersRequestId.current += 1;
      brandSelectPromise.current = null;
      flushSync(() => {
        setSession(null);
        setBrand(null);
        setOrders([]);
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

  const loadOrdersForBrand = useCallback(
    async (nextBrand: Brand, filters?: OrdersListFilters): Promise<Order[]> => {
      const requestId = ++ordersRequestId.current;
      const resolved = filters ?? ordersFiltersRef.current;
      const data = await apiFacade.getOrders(nextBrand, resolved);
      if (requestId !== ordersRequestId.current) return data;
      setOrders(data);
      return data;
    },
    [],
  );

  const refreshOrders = useCallback(async () => {
    if (!brand) return;
    setLoading(true);
    try {
      await loadOrdersForBrand(brand, ordersFiltersRef.current);
    } catch {
      showToast('toast.ordersLoadError');
    } finally {
      setLoading(false);
    }
  }, [brand, loadOrdersForBrand, showToast]);

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

      if (!brand) return;
      setLoading(true);
      try {
        await loadOrdersForBrand(brand, next);
      } catch {
        showToast('toast.ordersLoadError');
      } finally {
        setLoading(false);
      }
    },
    [brand, loadOrdersForBrand, showToast],
  );

  useEffect(() => {
    void apiMock.getNotifications().then(setNotifications);
  }, []);

  const clearBrand = useCallback(() => {
    ordersRequestId.current += 1;
    brandSelectPromise.current = null;
    setBrand(null);
    setOrders([]);
    const resetFilters = defaultOrdersFilters();
    ordersFiltersRef.current = resetFilters;
    setOrdersFiltersState(resetFilters);
    setKitchenMode(false);
    setBrandLoading(false);
    setLoading(false);
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
    ordersRequestId.current += 1;
    brandSelectPromise.current = null;
    flushSync(() => {
      setSession(null);
      setBrand(null);
      setOrders([]);
      setKitchenMode(false);
      setBrandLoading(false);
      setLoading(false);
      setAuthEpoch((n) => n + 1);
    });
    resetAuthStorage();
  }, []);

  const selectBrandAndLoad = useCallback(
    async (next: Brand) => {
      if (!session) return false;
      if (brandSelectPromise.current) return brandSelectPromise.current;

      const run = (async () => {
        const requestId = ++ordersRequestId.current;
        try {
          setBrandLoading(true);
          setBrand(next);
          setOrders([]);
          setSession((prev) => (prev ? { ...prev, brandId: next.id } : prev));
          localStorage.setItem(BRAND_KEY, next.id);
          sessionStorage.removeItem(PICK_BRAND_KEY);

          const data = await apiFacade.getOrders(next, ordersFiltersRef.current);
          if (requestId !== ordersRequestId.current) return false;

          flushSync(() => {
            setBrand(next);
            setOrders(data);
            setBrandLoading(false);
          });

          return true;
        } catch {
          if (requestId === ordersRequestId.current) {
            setBrand(null);
            setOrders([]);
            localStorage.removeItem(BRAND_KEY);
            setBrandLoading(false);
            showToast('toast.ordersLoadError');
          }
          return false;
        } finally {
          if (requestId === ordersRequestId.current) {
            setBrandLoading(false);
          }
        }
      })();

      brandSelectPromise.current = run;
      try {
        return await run;
      } finally {
        brandSelectPromise.current = null;
      }
    },
    [session, showToast],
  );

  const setDarkMode = useCallback((value: boolean) => {
    setDarkModeState(value);
  }, []);

  const toggleAgent = useCallback(() => {
    setAgentEnabled((current) => {
      const next = !current;
      localStorage.setItem(AGENT_KEY, String(next));
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(() => {
    if (!brand) return;
    localStorage.setItem(`${ONBOARDING_PREFIX}${brand.id}`, '1');
  }, [brand]);

  const isOnboardingDone = useCallback((brandId: string) => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(`${ONBOARDING_PREFIX}${brandId}`) === '1';
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const advanceOrder = useCallback(
    async (orderId: string) => {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;
      const transitions: Record<string, Order['status']> = {
        accepted: 'in_kitchen',
        in_kitchen: 'ready',
        ready: 'on_the_way',
        on_the_way: 'delivered',
      };
      const next = transitions[order.status];
      if (!next) return;

      try {
        const updated = await apiFacade.updateOrderStatus(orderId, next, order.orderNumber);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? updated ?? {
                  ...o,
                  status: next,
                  minutesInKitchen: next === 'in_kitchen' ? 0 : o.minutesInKitchen,
                }
              : o,
          ),
        );
        const toastKeys: Record<string, string> = {
          in_kitchen: 'toast.sentToKitchen',
          ready: 'toast.markedReady',
          on_the_way: 'toast.handedOff',
        };
        showToast(toastKeys[next] ?? 'toast.orderUpdated');
      } catch {
        showToast('toast.orderUpdateError');
      }
    },
    [orders, showToast],
  );

  const value = useMemo(
    () => ({
      session,
      brand,
      orders,
      ordersFilters,
      notifications,
      loading,
      brandLoading,
      brandTransitioning,
      kitchenMode,
      darkMode,
      agentEnabled,
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
      brand,
      orders,
      ordersFilters,
      notifications,
      loading,
      brandLoading,
      brandTransitioning,
      kitchenMode,
      darkMode,
      agentEnabled,
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

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
