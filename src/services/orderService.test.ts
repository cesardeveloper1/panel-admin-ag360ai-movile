import { describe, expect, it, vi } from 'vitest';
import { isMongoObjectId, orderService } from './orderService';
import { api } from './api';

vi.mock('./api', () => ({ api: { get: vi.fn(), put: vi.fn() } }));

it('does not accept a logical error inside an HTTP 200 mutation response', async () => {
  vi.mocked(api.put).mockResolvedValueOnce({ type: 'ERROR', statusCode: 403, message: 'Denied' });
  await expect(orderService.updateOrderStatus('507f1f77bcf86cd799439011', 'ready')).rejects.toMatchObject({ statusCode: 403 });
});

it('rejects detail from another branch even when the order endpoint returns it', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: { orderId: '507f1f77bcf86cd799439011', brandSubdomain: 'demo', branchId: 'other' } });
  const order = { id: '507f1f77bcf86cd799439011', branchId: 'mine' };
  await expect(orderService.getOrderDetail({ id: 'brand', subdomain: 'demo', initials: 'D', nameKey: 'demo', locations: 1, ordersToday: 0 }, order)).rejects.toThrow('scope');
});

it('requests the actual next page while preserving filters and identity metadata', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [{ orderId: 'order-a', status: 'Aceptado', agentStateId: 'conversation-a', channelAccountId: 'account-a' }], meta: { page: 2, total: 151 } } });
  const result = await orderService.getOrdersPage({ id: 'brand', subdomain: 'demo', initials: 'D', nameKey: 'demo', locations: 1, ordersToday: 0 }, { dateMode: 'last12Hours', page: 2, branchId: 'branch' });
  const query = new URLSearchParams(vi.mocked(api.get).mock.calls.at(-1)![0].split('?')[1]);
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
