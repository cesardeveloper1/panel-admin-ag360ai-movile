import type { Order, OrderItem } from '../../types';
import { mapStatusFromApi } from './orderStatusMapper';

/** Item de listado GET /orders (OrderFoodListItem del panel). */
export interface ApiOrderListItem {
  orderId?: string;
  orderNumber?: string;
  status?: string;
  brandSubdomain?: string;
  totalOrder?: number;
  customerName?: string;
  customerLastName?: string;
  customerPhone?: string;
  createdAt?: string;
  branchId?: string;
  source?: number;
  deliveryMode?: number;
  humanInteraction?: {
    withHumanInteraction?: boolean;
    postOrderHumanInteraction?: boolean;
  };
  timerOrderTime?: number;
  content?: {
    items?: Array<{
      name?: string;
      quantity?: number;
      price?: number;
    }>;
  };
}

function mapChannel(source: number | undefined): Order['channel'] {
  // Alineado a usos típicos del panel: 0/1 WhatsApp, otros web
  if (source === 2) return 'web';
  if (source === 3) return 'phone';
  return 'whatsapp';
}

function mapDeliveryType(mode: number | undefined): Order['deliveryType'] {
  // 0 delivery, 1/2 pickup (ver contratos panel)
  if (mode === 1 || mode === 2) return 'pickup';
  return 'delivery';
}

function mapItems(raw: ApiOrderListItem, total: number): OrderItem[] {
  const fromContent = raw.content?.items;
  if (Array.isArray(fromContent) && fromContent.length > 0) {
    return fromContent.map((item) => ({
      qty: Number(item.quantity) || 1,
      nameKey: 'orders.item',
      name: String(item.name ?? 'Producto'),
      price: Number(item.price) || 0,
    }));
  }
  return [
    {
      qty: 1,
      nameKey: 'orders.consumo',
      name: 'Consumo',
      price: total,
    },
  ];
}

export function mapOrderFromApi(raw: ApiOrderListItem, brandId: string): Order | null {
  const id = String(raw.orderId ?? '').trim();
  if (!id) return null;

  const first = String(raw.customerName ?? '').trim();
  const last = String(raw.customerLastName ?? '').trim();
  const customerName = [first, last].filter(Boolean).join(' ') || 'Cliente';
  const total = Number(raw.totalOrder) || 0;

  return {
    id,
    orderNumber: raw.orderNumber ? String(raw.orderNumber) : undefined,
    customerKey: 'customers.generic',
    customerName,
    status: mapStatusFromApi(raw.status),
    channel: mapChannel(raw.source),
    deliveryType: mapDeliveryType(raw.deliveryMode),
    items: mapItems(raw, total),
    total,
    minutesInKitchen:
      typeof raw.timerOrderTime === 'number' && Number.isFinite(raw.timerOrderTime)
        ? Math.max(0, Math.round(raw.timerOrderTime))
        : undefined,
    needsHuman: Boolean(raw.humanInteraction?.withHumanInteraction),
    brandId,
    locationKey: 'locations.central',
    phone: raw.customerPhone ? String(raw.customerPhone) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export function mapOrdersFromApi(list: ApiOrderListItem[], brandId: string): Order[] {
  return list
    .map((row) => mapOrderFromApi(row, brandId))
    .filter((o): o is Order => o !== null);
}
