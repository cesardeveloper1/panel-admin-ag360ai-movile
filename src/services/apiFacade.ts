import { config } from '../config/env';
import type { Brand, Order, OrderStatus, UserSession } from '../types';
import { clearAuthTokens } from '../utils/authSession';
import { apiMock } from './apiMock';
import { authService } from './authService';
import { brandService } from './brandService';
import { orderService } from './orderService';

/**
 * Fachada mock vs API real (PRP 007 auth + PRP 008 brands/orders).
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

  async getOrders(brand: Brand): Promise<Order[]> {
    if (config.useApiMock) {
      return apiMock.getOrders(brand.id);
    }
    return orderService.getOrders(brand);
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    orderNumber?: string,
  ): Promise<Order | null> {
    if (config.useApiMock) {
      return apiMock.updateOrderStatus(orderId, status);
    }
    await orderService.updateOrderStatus(orderId, status, orderNumber);
    return null;
  },
};
