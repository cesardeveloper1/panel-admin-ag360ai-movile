import { expect, it } from 'vitest';
import { mapDeliveryType, mapOrderDetail, mapOrderFromApi } from './orderMapper';

it('uses the real delivery mode enum, without making delivery into pickup', () => {
  expect([1, 2, 3, 4, 99].map(mapDeliveryType)).toEqual(['delivery', 'pickup', 'dine_in', 'scheduled', 'unknown']);
});
it('loads real products, modifiers, notes, payment and delivery from detail', () => {
  const result = mapOrderDetail({ orderId: 'a', status: 'Aceptado', customer: { firstName: 'Test', phone: '123' },
    deliveryInfo: { mode: 2, address: 'Synthetic address' }, paymentInformation: { paymentType: 4 },
    totals: { total: 25 }, content: { specialNotes: 'No cutlery', items: [{ itemName: 'Burger', quantity: 2, price: 10,
      customization: 'No salt', modifiers: [{ modName: 'Cheese', quantity: 1, price: 2 }] }] } }, 'b');
  expect(result).toMatchObject({ detailLoaded: true, total: 25, deliveryType: 'pickup', paymentMethod: 'plin',
    items: [{ name: 'Burger', qty: 2, notes: 'No salt', modifiers: [{ name: 'Cheese', qty: 1, price: 2 }] }], notes: 'No cutlery' });
});
it('does not manufacture a product or elapsed time from a timer threshold', () => {
  const result = mapOrderFromApi({ orderId: 'a', status: 'Aceptado', timerOrderTime: 15 }, 'b')!;
  expect(result.items).toEqual([]);
  expect(result.minutesInKitchen).toBeUndefined();
  expect(result.amountKnown).toBe(false);
});
