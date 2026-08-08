import type { OrderStatus } from '../../types';

/**
 * Estados API (ssgg / panel Operaciones) ↔ OrderStatus UI móvil.
 *
 * | API (newStatus)   | UI móvil      |
 * |-------------------|---------------|
 * | Pre Orden         | pre_order     |
 * | Programado        | pre_order     |
 * | Aceptado          | accepted      |
 * | En cocina         | in_kitchen    |
 * | Para recoger      | ready         |
 * | En camino         | on_the_way    |
 * | Entregado         | delivered     |
 * | Cancelado         | cancelled     |
 */

export const API_ORDER_STATUS = {
  PROGRAMADO: 'Programado',
  PRE_ORDEN: 'Pre Orden',
  ACEPTADO: 'Aceptado',
  EN_COCINA: 'En cocina',
  PARA_RECOGER: 'Para recoger',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
} as const;

const UI_TO_API: Record<OrderStatus, string> = {
  pre_order: API_ORDER_STATUS.PRE_ORDEN,
  accepted: API_ORDER_STATUS.ACEPTADO,
  in_kitchen: API_ORDER_STATUS.EN_COCINA,
  ready: API_ORDER_STATUS.PARA_RECOGER,
  on_the_way: API_ORDER_STATUS.EN_CAMINO,
  delivered: API_ORDER_STATUS.ENTREGADO,
  cancelled: API_ORDER_STATUS.CANCELADO,
};

export function mapStatusToApi(status: OrderStatus): string {
  return UI_TO_API[status] ?? API_ORDER_STATUS.ACEPTADO;
}

export function mapStatusFromApi(raw: string | undefined | null): OrderStatus {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  switch (key) {
    case 'pre orden':
    case 'preorden':
    case 'preorder':
    case 'pre_order':
    case 'programado':
      return 'pre_order';
    case 'aceptado':
    case 'accepted':
      return 'accepted';
    case 'en cocina':
    case 'en_cocina':
    case 'cooking':
      return 'in_kitchen';
    case 'para recoger':
    case 'para_recoger':
    case 'ready':
    case 'listo':
      return 'ready';
    case 'en camino':
    case 'en_camino':
    case 'on_the_way':
    case 'on_way':
      return 'on_the_way';
    case 'entregado':
    case 'delivered':
    case 'completed':
      return 'delivered';
    case 'cancelado':
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      console.warn('[orderStatusMapper] estado API desconocido, fallback accepted:', raw);
      return 'accepted';
  }
}
