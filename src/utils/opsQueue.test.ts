import { describe, expect, it } from 'vitest';
import { sortOpsQueue, urgencyRank } from './opsQueue';
import type { Order } from '../types';

const base = (partial: Partial<Order> & Pick<Order, 'id' | 'status'>): Order => ({
  customerKey: 'customers.lucia',
  channel: 'whatsapp',
  deliveryType: 'delivery',
  items: [],
  total: 10,
  brandId: 'b1',
  locationKey: 'locations.miraflores',
  ...partial,
});

describe('opsQueue', () => {
  it('ranks human / needsHuman first', () => {
    const human = base({ id: 'a', status: 'accepted', needsHuman: true });
    const ordering = base({ id: 'b', status: 'accepted' });
    expect(urgencyRank(human)).toBeLessThan(urgencyRank(ordering));
  });

  it('sorts queue human → ordering → starting', () => {
    const starting = base({ id: '3', status: 'pre_order' });
    const ordering = base({ id: '2', status: 'accepted' });
    const human = base({ id: '1', status: 'accepted', needsHuman: true });
    const sorted = sortOpsQueue([starting, ordering, human]);
    expect(sorted.map((o) => o.id)).toEqual(['1', '2', '3']);
  });
});
