import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { Brand, NotificationItem, Order, UserSession } from '../types';
import { apiMock } from '../services/apiMock';

export const BRAND_KEY = 'ag360-brand-id';
export const PICK_BRAND_KEY = 'ag360-pick-brand';
export const ONBOARDING_PREFIX = 'ag360-onboarding-';
const DARK_KEY = 'ag360-dark';

interface AppContextValue {
  session: UserSession | null;
  brand: Brand | null;
  orders: Order[];
  notifications: NotificationItem[];
  loading: boolean;
  brandLoading: boolean;
  kitchenMode: boolean;
  darkMode: boolean;
  authEpoch: number;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearBrand: () => void;
  prepareBrandPick: () => void;
  startBrandSwitch: () => void;
  selectBrandAndLoad: (brand: Brand) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  advanceOrder: (orderId: string) => void;
  setKitchenMode: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
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

function resetAuthStorage() {
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [kitchenMode, setKitchenMode] = useState(false);
  const [darkMode, setDarkModeState] = useState(readDarkMode);
  const [toast, setToast] = useState<string | null>(null);
  const [authEpoch, setAuthEpoch] = useState(0);

  const ordersRequestId = useRef(0);
  const brandSelectPromise = useRef<Promise<boolean> | null>(null);

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

  const loadOrdersForBrand = useCallback(async (brandId: string): Promise<Order[]> => {
    const requestId = ++ordersRequestId.current;
    const data = await apiMock.getOrders(brandId);
    if (requestId !== ordersRequestId.current) return data;
    setOrders(data);
    return data;
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!brand) return;
    setLoading(true);
    try {
      await loadOrdersForBrand(brand.id);
    } finally {
      setLoading(false);
    }
  }, [brand, loadOrdersForBrand]);

  useEffect(() => {
    void apiMock.getNotifications().then(setNotifications);
  }, []);

  const clearBrand = useCallback(() => {
    ordersRequestId.current += 1;
    brandSelectPromise.current = null;
    setBrand(null);
    setOrders([]);
    setKitchenMode(false);
    setBrandLoading(false);
    setLoading(false);
    localStorage.removeItem(BRAND_KEY);
  }, []);

  const prepareBrandPick = useCallback(() => {
    sessionStorage.setItem(PICK_BRAND_KEY, '1');
  }, []);

  const startBrandSwitch = useCallback(() => {
    ordersRequestId.current += 1;
    brandSelectPromise.current = null;
    prepareBrandPick();
    clearBrand();
    setAuthEpoch((n) => n + 1);
  }, [clearBrand, prepareBrandPick]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const user = await apiMock.login(email, password);
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

          const data = await apiMock.getOrders(next.id);
          if (requestId !== ordersRequestId.current) return false;

          flushSync(() => {
            setBrand(next);
            setOrders(data);
            setBrandLoading(false);
          });

          showToast('toast.brandSelected');
          return true;
        } catch {
          if (requestId === ordersRequestId.current) {
            setBrand(null);
            setOrders([]);
            localStorage.removeItem(BRAND_KEY);
            setBrandLoading(false);
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
      const transitions: Record<string, string> = {
        accepted: 'in_kitchen',
        in_kitchen: 'ready',
        ready: 'on_the_way',
        on_the_way: 'delivered',
      };
      const next = transitions[order.status];
      if (!next) return;
      const updated = await apiMock.updateOrderStatus(orderId, next as Order['status']);
      if (updated) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
        const toastKeys: Record<string, string> = {
          in_kitchen: 'toast.sentToKitchen',
          ready: 'toast.markedReady',
          on_the_way: 'toast.handedOff',
        };
        showToast(toastKeys[next] ?? 'toast.orderUpdated');
      }
    },
    [orders, showToast],
  );

  const value = useMemo(
    () => ({
      session,
      brand,
      orders,
      notifications,
      loading,
      brandLoading,
      kitchenMode,
      darkMode,
      authEpoch,
      login,
      logout,
      clearBrand,
      prepareBrandPick,
      startBrandSwitch,
      selectBrandAndLoad,
      refreshOrders,
      advanceOrder,
      setKitchenMode,
      setDarkMode,
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
      notifications,
      loading,
      brandLoading,
      kitchenMode,
      darkMode,
      authEpoch,
      login,
      logout,
      clearBrand,
      prepareBrandPick,
      startBrandSwitch,
      selectBrandAndLoad,
      refreshOrders,
      advanceOrder,
      setDarkMode,
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
