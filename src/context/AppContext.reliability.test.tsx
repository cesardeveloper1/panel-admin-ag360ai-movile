import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from './AppContext';
import { useApp } from '../hooks/useApp';
import type { AppContextValue } from './appContextInstance';
import { apiFacade } from '../services/apiFacade';
import type { Brand, Order } from '../types';
import '../i18n';

vi.mock('../services/apiFacade', () => ({ apiFacade: {
  restoreSession: vi.fn(async () => ({ email: 'test@example.invalid', nameKey: 'test', initials: 'T', role: 'owner', capabilities: { changeOrderStatus: true } })),
  getOrdersPage: vi.fn(), getOrderDetail: vi.fn(), updateOrderStatus: vi.fn(), getNotifications: vi.fn(async () => []),
  getBotState: vi.fn(async () => ({ isOn: false, lockedBySuperadmin: false })),
  logout: vi.fn(),
} }));
vi.mock('../native/paymentNotificationCapture', () => ({ paymentNotificationCapture: { unlinkDevice: vi.fn(async () => undefined) } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async () => ({ remove: vi.fn() })) } }));

let context: AppContextValue;
function Probe() { context = useApp(); return null; }
const brand: Brand = { id: 'a', subdomain: 'a', initials: 'A', nameKey: 'a', locations: 1, ordersToday: 0 };
const row = { id: 'one', brandId: 'a', status: 'accepted', deliveryType: 'delivery', items: [], total: 24, customerKey: 'test', locationKey: 'test', channel: 'whatsapp' } as Order;
const page = { data: [row], page: 1, hasMore: false };

async function mount() {
  render(<AppProvider><Probe /></AppProvider>);
  await waitFor(() => expect(context.session).not.toBeNull());
}
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);

describe('operation request ownership', () => {
  it('keeps selected brand on initial failure and recovers through retry', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(page);
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    expect(context.brand?.id).toBe('a');
    expect(context.ordersError).toBe(true);
    expect(context.orders).toEqual([]);
    await act(async () => { await context.refreshOrders(); });
    expect(context.ordersError).toBe(false);
    expect(context.orders).toEqual([row]);
  });

  it('removes previous cards when a refresh fails', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValueOnce(page).mockRejectedValueOnce(new Error('offline'));
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    expect(context.orders).toEqual([row]);
    await act(async () => { await context.refreshOrders(); });
    expect(context.ordersError).toBe(true);
    expect(context.orders).toEqual([]);
  });

  it('discards an old query after a branch change including its loading completion', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValueOnce(page);
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    let resolveOld!: (value: typeof page) => void;
    let resolveNew!: (value: typeof page) => void;
    vi.mocked(apiFacade.getOrdersPage)
      .mockImplementationOnce(() => new Promise<typeof page>(resolve => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise<typeof page>(resolve => { resolveNew = resolve; }));
    let oldRequest!: Promise<void>;
    let newRequest!: Promise<void>;
    act(() => { oldRequest = context.setOrdersFilters({ branchId: 'old' }); });
    act(() => { newRequest = context.setOrdersFilters({ branchId: 'new' }); });
    await act(async () => { resolveOld(page); await oldRequest; });
    expect(context.orders).toEqual([]);
    expect(context.loading).toBe(true);
    await act(async () => { resolveNew({ ...page, data: [{ ...row, id: 'new' }] }); await newRequest; });
    expect(context.orders.map(item => item.id)).toEqual(['new']);
    expect(context.loading).toBe(false);
  });

  it('does not restore cards from a response after logout', async () => {
    let resolve!: (value: typeof page) => void;
    vi.mocked(apiFacade.getOrdersPage).mockImplementationOnce(() => new Promise<typeof page>(done => { resolve = done; }));
    await mount();
    let pending!: Promise<boolean>;
    act(() => { pending = context.selectBrandAndLoad(brand); });
    act(() => context.logout());
    await act(async () => { resolve(page); await pending; });
    expect(context.orders).toEqual([]);
    expect(context.brand).toBeNull();
    expect(context.session).toBeNull();
  });

  it('loads a second page once and merges repeated identities without duplicates', async () => {
    const firstRows = Array.from({ length: 150 }, (_, i) => ({ ...row, id: String(i) }));
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValueOnce({ data: firstRows, page: 1, hasMore: true, total: 151 });
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValueOnce({ data: [{ ...row, id: '149' }, { ...row, id: '150' }], page: 2, hasMore: false, total: 151 });
    await act(async () => { await Promise.all([context.loadMoreOrders(), context.loadMoreOrders()]); });
    expect(context.orders).toHaveLength(151);
    expect(context.ordersHasMore).toBe(false);
    expect(apiFacade.getOrdersPage).toHaveBeenCalledTimes(2);
    expect(apiFacade.getOrdersPage).toHaveBeenLastCalledWith(brand, expect.objectContaining({ page: 2 }));
    expect(context.ordersLastSyncedAt).not.toBeNull();
  });
});


describe('confirmed order mutations', () => {
  it('deduplicates double taps and waits for the confirmed server read', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValue(page);
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    const confirmed = { ...row, status: 'in_kitchen' as const, updatedAt: '2026-10-23T15:00:00Z' };
    vi.mocked(apiFacade.getOrderDetail).mockResolvedValueOnce(row).mockResolvedValueOnce(confirmed);
    let finish!: (value: Order | null) => void;
    vi.mocked(apiFacade.updateOrderStatus).mockImplementationOnce(() => new Promise<Order | null>(resolve => { finish = resolve; }));
    let first!: ReturnType<AppContextValue['advanceOrder']>;
    let second!: ReturnType<AppContextValue['advanceOrder']>;
    act(() => { first = context.advanceOrder(row.id, 'accepted'); second = context.advanceOrder(row.id, 'accepted'); });
    expect(first).toBe(second);
    await waitFor(() => expect(apiFacade.updateOrderStatus).toHaveBeenCalledTimes(1));
    expect(context.orderMutations[row.id].pending).toBe(true);
    expect(context.orders[0].status).toBe('accepted');
    await act(async () => { finish(null); await first; });
    expect(context.orders[0].status).toBe('in_kitchen');
    expect(context.orderMutations[row.id].pending).toBe(false);
  });

  it('preserves the order and exposes an explicit error when the API rejects the change', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValue(page);
    vi.mocked(apiFacade.getOrderDetail).mockResolvedValueOnce(row);
    vi.mocked(apiFacade.updateOrderStatus).mockRejectedValueOnce(new Error('forbidden'));
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    await act(async () => { expect(await context.advanceOrder(row.id)).toMatchObject({ ok: false, reason: 'failed' }); });
    expect(context.orders[0].status).toBe('accepted');
    expect(context.orderMutations[row.id]).toMatchObject({ pending: false, errorKey: 'ops.actions.failed' });
  });

  it('reconciles a preflight conflict without sending a mutation', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValue(page);
    vi.mocked(apiFacade.getOrderDetail).mockResolvedValueOnce({ ...row, status: 'ready' });
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    await act(async () => { expect(await context.advanceOrder(row.id)).toMatchObject({ ok: false, reason: 'conflict' }); });
    expect(apiFacade.updateOrderStatus).not.toHaveBeenCalled();
    expect(context.orders[0].status).toBe('ready');
  });

  it('does not overwrite a mutation with a refresh that started before it completed', async () => {
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValueOnce(page);
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    let finishRefresh!: (value: typeof page) => void;
    vi.mocked(apiFacade.getOrdersPage).mockImplementationOnce(() => new Promise<typeof page>(resolve => { finishRefresh = resolve; }));
    let refresh!: Promise<void>;
    act(() => { refresh = context.refreshOrders(); });
    vi.mocked(apiFacade.getOrderDetail).mockResolvedValueOnce(row).mockResolvedValueOnce({ ...row, status: 'in_kitchen' });
    vi.mocked(apiFacade.updateOrderStatus).mockResolvedValueOnce(null);
    await act(async () => { await context.advanceOrder(row.id); });
    await act(async () => { finishRefresh(page); await refresh; });
    expect(context.orders[0].status).toBe('in_kitchen');
  });

  it('denies a session without effective capability before contacting the order API', async () => {
    vi.mocked(apiFacade.restoreSession).mockResolvedValueOnce({ email: 'test@example.invalid', nameKey: 'test', initials: 'T', role: 'worker', capabilities: { changeOrderStatus: false } });
    vi.mocked(apiFacade.getOrdersPage).mockResolvedValue(page);
    await mount();
    await act(async () => { await context.selectBrandAndLoad(brand); });
    await act(async () => { expect(await context.advanceOrder(row.id)).toEqual({ ok: false, reason: 'denied' }); });
    expect(apiFacade.getOrderDetail).not.toHaveBeenCalled();
    expect(apiFacade.updateOrderStatus).not.toHaveBeenCalled();
  });
});
