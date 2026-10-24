import React, { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { config } from '../config/env';
import { useApp } from '../hooks/useApp';
import { useAuthToken } from '../hooks/useAuthToken';
import { acceptCue, deliverNotificationCue, startNotificationCues } from '../notifications/deliverNotificationCue';
import { complaintCue, orderCueSound } from '../notifications/notificationCues';
import { resolveSocketBaseUrl } from '../utils/resolveSocketBaseUrl';
import {
  orderSocketEventMatchesBrand,
  type OrderSocketEventShape,
} from '../services/orderSocketBrandScope';
import { printThermalPayloadDirectly } from '../services/directMobilePrint';

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
  const { t } = useTranslation();
  const { session, brand, refreshOrders } = useApp();
  const token = useAuthToken();
  const refreshTimer = useRef<number | null>(null);
  const ordersSocketRef = useRef<Socket | null>(null);
  const eventsSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (config.useApiMock) return;
    if (!session || !brand?.id) return;

    if (!token) return;

    startNotificationCues();
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

      const sound = orderCueSound({
        role: session.role,
        type,
        playSound: event.data?.playSound,
        status: event.data?.status,
      });
      const orderId = event.data?._id || event.data?.orderId || event.data?.orderNumber;
      if (sound && acceptCue(`${type}:${orderId ?? ''}`)) {
        const number = event.data?.orderNumber || orderId || '';
        void deliverNotificationCue({
          sound,
          title: t(type === 'order_created' ? 'cues.orderTitle' : 'cues.orderStatusTitle'),
          body: number ? t('cues.orderBody', { number }) : t('cues.orderTitle'),
        });
      }

      if (type === 'order_created') {
        if (event.data?.thermalPrint) {
          void printThermalPayloadDirectly({
            activeBrandId: brand.id,
            branchId: event.data.branchId,
            payload: event.data.thermalPrint,
          }).catch((error) => {
            if (config.environment === 'development') {
              console.warn('[mobile] impresión térmica directa falló', error);
            }
          });
        }
      }
    };

    const handleEventsEvent = (event: { type?: string; data?: { category?: unknown; _id?: string; id?: string; message?: string } }) => {
      if (!complaintCue(event)) return;
      const id = String(event.data?._id ?? event.data?.id ?? event.data?.message ?? '');
      if (!acceptCue(`complaint:${id}`)) return;
      void deliverNotificationCue({
        sound: 'sos',
        title: t('cues.complaintTitle'),
        body: t('cues.complaintBody'),
      });
    };

    ordersSocket.on('event', handleOrdersEvent);
    eventsSocket.on('event', handleEventsEvent);
    // A socket connection is not proof of fresh data: revalidate the list.
    ordersSocket.on('connect', scheduleRefresh);

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
      eventsSocket.off('event', handleEventsEvent);
      ordersSocket.disconnect();
      eventsSocket.disconnect();
      ordersSocketRef.current = null;
      eventsSocketRef.current = null;
    };
  }, [session, brand?.id, brand?.subdomain, refreshOrders, t, token]);

  return <>{children}</>;
};
