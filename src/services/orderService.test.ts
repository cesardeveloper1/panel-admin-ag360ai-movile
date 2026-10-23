import { describe, expect, it, vi } from 'vitest';
import { isMongoObjectId, orderService } from './orderService';
import { api } from './api';

vi.mock('./api', () => ({ api: { get: vi.fn() } }));

it('requests the actual next page while preserving filters and identity metadata', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [{ orderId: 'order-a', status: 'Aceptado', agentStateId: 'conversation-a', channelAccountId: 'account-a' }], meta: { page: 2, total: 151 } } });
  const result = await orderService.getOrdersPage({ id: 'brand', subdomain: 'demo', initials: 'D', nameKey: 'demo', locations: 1, ordersToday: 0 }, { dateMode: 'last12Hours', page: 2, branchId: 'branch' });
  const query = new URLSearchParams(vi.mocked(api.get).mock.calls[0][0].split('?')[1]);
  expect(query.get('page')).toBe('2');
  expect(query.get('branchId')).toBe('branch');
  expect(query.get('last12Hours')).toBe('true');
  expect(result).toMatchObject({ hasMore: false, total: 151, data: [{ agentStateId: 'conversation-a', channelAccountId: 'account-a' }] });
});

describe('isMongoObjectId', () => {
  it('acepta ObjectIds de 24 hex', () => {
    expect(isMongoObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isMongoObjectId('ABCDEF0123456789abcdef01')).toBe(true);
  });

  it('rechaza orderNumber u otros ids', () => {
    expect(isMongoObjectId('SMASHBURGER-20240807-0001')).toBe(false);
    expect(isMongoObjectId('A-2850')).toBe(false);
    expect(isMongoObjectId('')).toBe(false);
    expect(isMongoObjectId('507f1f77bcf86cd79943901')).toBe(false);
  });
});
