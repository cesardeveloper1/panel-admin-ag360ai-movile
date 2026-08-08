import { config } from '../config/env';
import type { Brand, DashboardReport, Order, OrderStatus, UserSession } from '../types';
import { clearAuthTokens } from '../utils/authSession';
import { apiMock } from './apiMock';
import { authService } from './authService';
import { brandService } from './brandService';
import { dashboardService } from './dashboardService';
import { orderService } from './orderService';
import { botService, type BotCtxState } from './botService';
import {
  defaultOrdersFilters,
  type OrdersListFilters,
} from './ordersQuery';

export type { OrdersListFilters } from './ordersQuery';
export type { BotCtxState } from './botService';

export interface GetDashboardFacadeParams {
  brand: Brand;
  period: 'today' | 'range';
  rangeDays?: number;
  rangeStart?: string;
  rangeEnd?: string;
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

/**
 * Fachada mock vs API real (auth, brands, orders, dashboard).
 */
export const apiFacade = {
  useMock: config.useApiMock,

  async login(email: string, password: string): Promise<UserSession | null> {
    if (config.useApiMock) {
      clearAuthTokens();
      return apiMock.login(email, password);
    }
    return authService.login(email, password);
  },

  logout(): void {
    if (!config.useApiMock) {
      clearAuthTokens();
    }
  },

  async getBrands(): Promise<Brand[]> {
    if (config.useApiMock) {
      return apiMock.getBrands();
    }
    return brandService.getAll();
  },

  async getOrders(
    brand: Brand,
    filters: OrdersListFilters = defaultOrdersFilters(),
  ): Promise<Order[]> {
    if (config.useApiMock) {
      return apiMock.getOrders(brand.id, filters);
    }
    return orderService.getOrders(brand, filters);
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    orderNumber?: string,
    reason?: string,
  ): Promise<Order | null> {
    if (config.useApiMock) {
      return apiMock.updateOrderStatus(orderId, status);
    }
    await orderService.updateOrderStatus(orderId, status, orderNumber, reason);
    return null;
  },

  async getDashboard(params: GetDashboardFacadeParams): Promise<DashboardReport> {
    const { brand, period, rangeDays = 7, rangeStart, rangeEnd } = params;

    if (config.useApiMock) {
      return apiMock.getDashboard(brand.id, period, rangeDays, rangeStart, rangeEnd);
    }

    const today = toLocalIsoDate(new Date());
    let dateFrom = today;
    let dateTo = today;
    let resolvedPeriod: 'today' | 'range' = period;

    if (period === 'today' && !rangeStart) {
      dateFrom = today;
      dateTo = today;
      resolvedPeriod = 'today';
    } else if (rangeStart) {
      dateFrom = rangeStart;
      dateTo = rangeEnd ?? rangeStart;
      resolvedPeriod = dateFrom === today && dateTo === today ? 'today' : 'range';
    } else {
      dateTo = today;
      dateFrom = shiftIsoDate(today, -(Math.max(1, rangeDays) - 1));
      resolvedPeriod = 'range';
    }

    return dashboardService.getDashboard({
      brand,
      dateFrom,
      dateTo,
      period: resolvedPeriod,
    });
  },

  async getBotState(subDomain: string): Promise<BotCtxState> {
    if (config.useApiMock) {
      return {
        subDomain,
        isOn: typeof localStorage !== 'undefined' && localStorage.getItem('ag360-agent-enabled') === 'true',
        lockedBySuperadmin: false,
      };
    }
    return botService.getState(subDomain);
  },

  async setBotEnabled(subDomain: string, isOn: boolean): Promise<BotCtxState> {
    if (config.useApiMock) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('ag360-agent-enabled', String(isOn));
      }
      return { subDomain, isOn, lockedBySuperadmin: false };
    }
    return botService.setEnabled(subDomain, isOn);
  },
};
