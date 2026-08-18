import React, { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { config } from '../config/env';
import { useApp } from '../hooks/useApp';
import { useAuthToken } from '../hooks/useAuthToken';
import { resolveSocketBaseUrl } from '../utils/resolveSocketBaseUrl';
import {
  orderSocketEventMatchesBrand,
  type OrderSocketEventShape,
} from '../services/orderSocketBrandScope';
import { mobilePrintSignals } from '../services/mobilePrintSignals';

const ORDER_REFRESH_TYPES = new Set([
  'order_created',
  'order_updated',
  'order_status_changed',
  'order_assigned',
  'order_cancelled',
]);

/**
 * Conecta /orders y /events cuando hay sesión + marca y mock off.
 * Refresca pedidos ante eventos de la marca activa.
 */
export const OrdersSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, brand, refreshOrders, showToast } = useApp();
  const token = useAuthToken();
  const refreshTimer = useRef<number | null>(null);
  const ordersSocketRef = useRef<Socket | null>(null);
  const eventsSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (config.useApiMock) return;
    if (!session || !brand?.id) return;

    if (!token) return;

    const base = resolveSocketBaseUrl();
    const socketAuth = { token };
    const query = {
      role: (session.role || 'owner').toUpperCase(),
      brandId: brand.id,
      brandSubdomain: brand.subdomain || undefined,
    };

    const scheduleRefresh = () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        void refreshOrders();
      }, 320);
    };

    const ordersSocket = io(`${base}/orders`, {
      auth: socketAuth,
      query,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
    });

    const eventsSocket = io(`${base}/events`, {
      auth: socketAuth,
      query: {
        brandId: brand.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    ordersSocketRef.current = ordersSocket;
    eventsSocketRef.current = eventsSocket;

    const active = {
      brandId: brand.id,
      brandSubdomain: brand.subdomain ?? null,
    };

    const handleOrdersEvent = (event: OrderSocketEventShape) => {
      if (!orderSocketEventMatchesBrand(event, active)) return;

      const type = event.type || '';
      if (!ORDER_REFRESH_TYPES.has(type)) return;

      scheduleRefresh();

      if (type === 'order_created') {
        showToast('toast.socketNewOrder');
      }
    };

    ordersSocket.on('event', handleOrdersEvent);
    ordersSocket.on('mobile_print_job_available', () => {
      mobilePrintSignals.notify();
    });
    ordersSocket.on('connect', () => {
      mobilePrintSignals.notify();
    });

    if (config.environment === 'development') {
      ordersSocket.on('connect', () => {
        console.log('[mobile] /orders socket conectado', { brandId: brand.id });
      });
      ordersSocket.on('connect_error', (err) => {
        console.warn('[mobile] /orders connect_error', err.message);
      });
      eventsSocket.on('connect', () => {
        console.log('[mobile] /events socket conectado');
      });
    }

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      ordersSocket.off('event', handleOrdersEvent);
      ordersSocket.off('mobile_print_job_available');
      ordersSocket.disconnect();
      eventsSocket.disconnect();
      ordersSocketRef.current = null;
      eventsSocketRef.current = null;
    };
  }, [session, brand?.id, brand?.subdomain, refreshOrders, showToast, token]);

  return <>{children}</>;
};
