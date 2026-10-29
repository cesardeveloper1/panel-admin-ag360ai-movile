import type { Order, OrderItem } from '../../types';
import { API_ORDER_STATUS, mapStatusFromApi } from './orderStatusMapper';

/** Item de listado GET /orders (OrderFoodListItem del panel). */
export interface ApiOrderListItem {
  orderId?: string;
  agentStateId?: string | null;
  channelAccountId?: string | null;
  channel?: string | null;
  orderNumber?: string;
  status?: string;
  brandSubdomain?: string;
  totalOrder?: number;
  customerName?: string;
  customerLastName?: string;
  customerPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledAt?: string;
  branchId?: string;
  branchName?: string | null;
  riderId?: string | null;
  riderStep?: 'assigned' | 'picked_up' | 'delivered' | null;
  deliveryAddress?: string | null;
  deliveryAddressRef?: string | null;
  deliveryTracking?: { sharingLink?: string | null } | null;
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
      itemName?: string;
      quantity?: number;
      price?: number;
      customization?: string;
      modifiers?: Array<{ modName?: string; quantity?: number; price?: number }>;
    }>;
    specialNotes?: string;
  };
}

function mapChannel(source: number | undefined, channel?: string | null): Order['channel'] {
  if (channel === 'whatsapp' || channel === 'instagram' || channel === 'messenger') return channel;
  if (source === 1) return 'whatsapp';
  if (source === 2) return 'web';
  if (source === 4) return 'manual';
  if (source === 5) return 'instagram';
  if (source === 6) return 'messenger';
  return 'unknown';
}

export function mapDeliveryType(mode: number | undefined): Order['deliveryType'] {
  if (mode === 1) return 'delivery';
  if (mode === 2) return 'pickup';
  if (mode === 3) return 'dine_in';
  if (mode === 4) return 'scheduled';
  return 'unknown';
}

function mapItems(raw: ApiOrderListItem): OrderItem[] {
  return (raw.content?.items ?? []).map(item => ({
    qty: Number(item.quantity) || 1,
    nameKey: 'orders.item',
    name: item.itemName?.trim() || item.name?.trim() || undefined,
    price: Number(item.price) || 0,
    notes: item.customization?.trim() || undefined,
    modifiers: item.modifiers?.map(modifier => ({ name: modifier.modName?.trim() || '',
      qty: Number(modifier.quantity) || 1, price: Number(modifier.price) || 0 })),
  }));
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
    agentStateId: raw.agentStateId?.trim() || undefined,
    channelAccountId: raw.channelAccountId?.trim() || undefined,
    messagingChannel: raw.channel?.trim() || undefined,
    orderNumber: raw.orderNumber ? String(raw.orderNumber) : undefined,
    customerKey: 'customers.generic',
    customerName,
    status: mapStatusFromApi(raw.status),
    statusVerified: Object.values(API_ORDER_STATUS).some(value => value === raw.status),
    channel: mapChannel(raw.source, raw.channel),
    deliveryType: mapDeliveryType(raw.deliveryMode),
    items: mapItems(raw),
    amountKnown: typeof raw.totalOrder === 'number' && Number.isFinite(raw.totalOrder),
    branchId: raw.branchId,
    notes: raw.content?.specialNotes,
    scheduledAt: raw.scheduledAt,
    total,
    needsHuman: Boolean(raw.humanInteraction?.withHumanInteraction),
    brandId,
    locationKey: 'ops.reliability.noInformation',
    phone: raw.customerPhone?.trim() || undefined,
    address: raw.deliveryAddress?.trim() || undefined,
    addressReference: raw.deliveryAddressRef?.trim() || undefined,
    branchName: raw.branchName?.trim() || undefined,
    riderId: raw.riderId?.trim() || undefined,
    riderStep: raw.riderStep ?? undefined,
    sharingLink: raw.deliveryTracking?.sharingLink?.trim() || undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt,
  };
}

export function mapOrdersFromApi(list: ApiOrderListItem[], brandId: string): Order[] {
  return list
    .map((row) => mapOrderFromApi(row, brandId))
    .filter((o): o is Order => o !== null);
}

export interface ApiOrderDetail extends ApiOrderListItem {
  brandId?: string;
  customer?: { firstName?: string; lastName?: string; phone?: string };
  deliveryInfo?: {
    mode?: number;
    address?: string;
    addressRef?: string;
    latitude?: string | number;
    longitude?: string | number;
    riderId?: string;
    riderStep?: 'assigned' | 'picked_up' | 'delivered';
  };
  paymentInformation?: { paymentType?: number };
  totals?: { total?: number };
}

export function mapOrderDetail(raw: ApiOrderDetail, brandId: string): Order | null {
  const order = mapOrderFromApi({ ...raw, customerName: raw.customer?.firstName,
    customerLastName: raw.customer?.lastName, customerPhone: raw.customer?.phone,
    deliveryMode: raw.deliveryInfo?.mode, totalOrder: raw.totals?.total }, brandId);
  if (!order) return null;
  const methods: Record<number, Order['paymentMethod']> = { 1: 'cash', 2: 'card', 3: 'yape', 4: 'plin' };
  const latitude = Number(raw.deliveryInfo?.latitude);
  const longitude = Number(raw.deliveryInfo?.longitude);
  return { ...order, detailLoaded: true,
    address: raw.deliveryInfo?.address || order.address,
    addressReference: raw.deliveryInfo?.addressRef || order.addressReference,
    branchName: raw.branchName?.trim() || order.branchName,
    riderId: raw.deliveryInfo?.riderId || order.riderId,
    riderStep: raw.deliveryInfo?.riderStep || order.riderStep,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    sharingLink: raw.deliveryTracking?.sharingLink?.trim() || order.sharingLink,
    paymentMethod: methods[raw.paymentInformation?.paymentType ?? -1] };
}
