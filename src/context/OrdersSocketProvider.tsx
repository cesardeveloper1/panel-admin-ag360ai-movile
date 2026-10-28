import React, { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { config } from '../config/env';
import { useApp } from '../hooks/useApp';
import { useAuthToken } from '../hooks/useAuthToken';
import { acceptCue, deliverNotificationCue, startNotificationCues } from '../notifications/deliverNotificationCue';
import { complaintCue, orderCueSound, reservationCueKind } from '../notifications/notificationCues';
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
 * Conecta /orders, /events y /reservations cuando hay sesión + marca y mock off.
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
    const motorized = session?.role === 'motorized';
    if (!session || !token) return;
    if (!motorized && !brand?.id) return;

    startNotificationCues();
    const base = resolveSocketBaseUrl();
    const socketAuth = { token };
    const query = {
      role: (session.role || 'owner').toUpperCase(),
      brandId: brand?.id,
      brandSubdomain: brand?.subdomain || undefined,
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

    const eventsSocket = motorized ? null : io(`${base}/events`, {
      auth: socketAuth,
      query: {
        brandId: brand?.id,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const reservationsSocket = motorized ? null : io(`${base}/reservations`, {
      auth: socketAuth,
      query,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    ordersSocketRef.current = ordersSocket;
    eventsSocketRef.current = eventsSocket;

    const active = {
      brandId: brand?.id ?? '',
      brandSubdomain: brand?.subdomain ?? null,
    };

    const handleOrdersEvent = (event: OrderSocketEventShape) => {
      if (!motorized && !orderSocketEventMatchesBrand(event, active)) return;

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
          cardKey: `order:${orderId || number || 'latest'}`,
          title: t(type === 'order_created' ? 'cues.orderTitle' : 'cues.orderStatusTitle'),
          body: number ? t('cues.orderBody', { number }) : t('cues.orderTitle'),
        });
      }

      if (type === 'order_created' && brand) {
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
        cardKey: `complaint:${id || 'latest'}`,
        title: t('cues.complaintTitle'),
        body: t('cues.complaintBody'),
      });
    };

    const handleReservationsEvent = (event: {
      type?: string;
      brandId?: string;
      brandKey?: string;
      data?: {
        _id?: string;
        brandSubdomain?: string;
        reservationNumber?: number;
        client?: { name?: string };
        partySize?: number;
        reservationTime?: string;
      };
    }) => {
      if (!orderSocketEventMatchesBrand(event, active)) return;
      const kind = reservationCueKind(event.type);
      if (!kind) return;
      const reservationId = event.data?._id || '';
      if (!acceptCue(`reservation:${reservationId}:${kind}`)) return;
      const who = event.data?.client?.name?.trim() ?? '';
      const when = (event.data?.reservationTime ?? '').slice(0, 5);
      const party = event.data?.partySize;
      const number = event.data?.reservationNumber;
      const body = [
        typeof number === 'number' ? `#${number}` : '',
        who,
        typeof party === 'number' && party > 0 ? t('cues.reservationParty', { count: party }) : '',
        when,
      ].filter(Boolean).join(' · ');
      const titleKey = kind === 'created'
        ? 'cues.reservationTitle'
        : kind === 'cancelled'
          ? 'cues.reservationCancelledTitle'
          : 'cues.reservationUpdatedTitle';
      void deliverNotificationCue({
        sound: 'reserva',
        cardKey: `reservation:${reservationId || number || 'latest'}`,
        title: t(titleKey),
        body: body || t('cues.reservationTitle'),
      });
    };

    ordersSocket.on('event', handleOrdersEvent);
    eventsSocket?.on('event', handleEventsEvent);
    reservationsSocket?.on('event', handleReservationsEvent);
    // A socket connection is not proof of fresh data: revalidate the list.
    ordersSocket.on('connect', scheduleRefresh);

    if (config.environment === 'development') {
      ordersSocket.on('connect', () => {
        console.log('[mobile] /orders socket conectado', { brandId: brand?.id ?? null });
      });
      ordersSocket.on('connect_error', (err) => {
        console.warn('[mobile] /orders connect_error', err.message);
      });
      eventsSocket?.on('connect', () => {
        console.log('[mobile] /events socket conectado');
      });
      reservationsSocket?.on('connect', () => {
        console.log('[mobile] /reservations socket conectado', { brandId: brand?.id ?? null });
      });
    }

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      ordersSocket.off('event', handleOrdersEvent);
      eventsSocket?.off('event', handleEventsEvent);
      reservationsSocket?.off('event', handleReservationsEvent);
      ordersSocket.disconnect();
      eventsSocket?.disconnect();
      reservationsSocket?.disconnect();
      ordersSocketRef.current = null;
      eventsSocketRef.current = null;
    };
  }, [session, brand?.id, brand?.subdomain, refreshOrders, t, token]);

  return <>{children}</>;
};
