import { describe, expect, it } from 'vitest';
import {
  mapStatusFromApi,
  mapStatusToApi,
  API_ORDER_STATUS,
} from './orderStatusMapper';

describe('orderStatusMapper', () => {
  it('maps API labels to UI statuses', () => {
    expect(mapStatusFromApi('Pre Orden')).toBe('pre_order');
    expect(mapStatusFromApi('Programado')).toBe('pre_order');
    expect(mapStatusFromApi('Aceptado')).toBe('accepted');
    expect(mapStatusFromApi('En cocina')).toBe('in_kitchen');
    expect(mapStatusFromApi('Para recoger')).toBe('ready');
    expect(mapStatusFromApi('En camino')).toBe('on_the_way');
    expect(mapStatusFromApi('Entregado')).toBe('delivered');
    expect(mapStatusFromApi('Cancelado')).toBe('cancelled');
  });

  it('maps UI statuses to API newStatus strings', () => {
    expect(mapStatusToApi('pre_order')).toBe(API_ORDER_STATUS.PRE_ORDEN);
    expect(mapStatusToApi('accepted')).toBe(API_ORDER_STATUS.ACEPTADO);
    expect(mapStatusToApi('in_kitchen')).toBe(API_ORDER_STATUS.EN_COCINA);
    expect(mapStatusToApi('ready')).toBe(API_ORDER_STATUS.PARA_RECOGER);
    expect(mapStatusToApi('on_the_way')).toBe(API_ORDER_STATUS.EN_CAMINO);
    expect(mapStatusToApi('delivered')).toBe(API_ORDER_STATUS.ENTREGADO);
    expect(mapStatusToApi('cancelled')).toBe(API_ORDER_STATUS.CANCELADO);
  });

  it('falls back unknown API status to accepted', () => {
    expect(mapStatusFromApi('estado-raro')).toBe('accepted');
  });
});
