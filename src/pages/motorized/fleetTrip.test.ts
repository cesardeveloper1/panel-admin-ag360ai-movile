import { expect, it } from 'vitest';
import { navigationHref, riderScreen, unassignedDispatchOrders } from './fleetTrip';
import type { Order } from '../../types';

const order = (patch: Partial<Order>): Order => ({
  id: '1',
  customerKey: 'customers.generic',
  status: 'in_kitchen',
  channel: 'whatsapp',
  deliveryType: 'delivery',
  items: [],
  total: 10,
  brandId: 'brand',
  locationKey: 'ops.reliability.noInformation',
  ...patch,
});

it('deja en la cola solo lo que todavía no tiene repartidor', () => {
  const rows = unassignedDispatchOrders([
    order({ id: 'a' }),
    order({ id: 'b', riderId: 'rider' }),
    order({ id: 'c', status: 'delivered' }),
    order({ id: 'd', status: 'on_the_way' }),
    order({ id: 'e', status: 'cancelled' }),
  ]);
  expect(rows.map((item) => item.id)).toEqual(['a']);
});

it('abre el viaje en camino y, si no hay, el que el repartidor eligió', () => {
  const kitchen = [order({ id: 'a' }), order({ id: 'b' })];
  expect(riderScreen(kitchen, null).kind).toBe('list');
  expect(riderScreen(kitchen, 'b')).toMatchObject({ kind: 'trip', order: { id: 'b' } });
  expect(riderScreen([...kitchen, order({ id: 'c', status: 'on_the_way' })], 'b'))
    .toMatchObject({ kind: 'trip', order: { id: 'c' } });
});

it('arma la navegación con coordenadas y, si faltan, con la dirección', () => {
  expect(navigationHref(order({ latitude: -12.1, longitude: -77 }))).toContain('-12.1,-77');
  expect(navigationHref(order({ address: 'Av. Lima 1' }))).toContain('Av.%20Lima%201');
  expect(navigationHref(order({}))).toBeNull();
});
