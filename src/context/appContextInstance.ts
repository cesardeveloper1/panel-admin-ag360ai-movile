import { createContext } from 'react';
import type { Brand, NotificationItem, Order, UserSession } from '../types';
import type { OrdersListFilters } from '../services/ordersQuery';

export interface AppContextValue {
  session: UserSession | null;
  authRestoring: boolean;
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
  agentLocked: boolean;
  agentBusy: boolean;
  authEpoch: number;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearBrand: () => void;
  prepareBrandPick: () => void;
  startBrandSwitch: () => void;
  selectBrandAndLoad: (brand: Brand) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
  setOrdersFilters: (patch: Partial<OrdersListFilters>) => Promise<void>;
  advanceOrder: (orderId: string) => void;
  setKitchenMode: (value: boolean) => void;
  setDarkMode: (value: boolean) => void;
  toggleAgent: () => Promise<void>;
  toast: string | null;
  showToast: (key: string, params?: Record<string, string | number>) => void;
  completeOnboarding: () => void;
  isOnboardingDone: (brandId: string) => boolean;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);
