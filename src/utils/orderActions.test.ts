import { describe, expect, it } from 'vitest';
import { authenticatedOrderCapability, mergeConfirmedOrder, nextOrderAction, normalizeUserRole } from './orderActions';
import type { Order } from '../types';

const order = { id: 'a', status: 'ready', deliveryType: 'delivery', brandId: 'b' } as Order;

describe('next permitted order action', () => {
  it.each([
    ['accepted', 'delivery', 'in_kitchen'], ['in_kitchen', 'delivery', 'ready'],
    ['ready', 'delivery', 'on_the_way'], ['ready', 'pickup', 'delivered'],
    ['ready', 'dine_in', 'delivered'], ['on_the_way', 'delivery', 'delivered'],
  ] as const)('%s / %s advances to %s', (status, deliveryType, expected) => {
    expect(nextOrderAction({ ...order, status, deliveryType }, true)?.next).toBe(expected);
  });
  it.each(['unknown', 'scheduled'] as const)('does not guess fulfillment for %s', deliveryType => {
    expect(nextOrderAction({ ...order, deliveryType }, true)).toBeNull();
  });
  it('denies terminal, unverified and unauthorized changes', () => {
    expect(nextOrderAction(order, false)).toBeNull();
    expect(nextOrderAction({ ...order, statusVerified: false }, true)).toBeNull();
    expect(nextOrderAction({ ...order, status: 'cancelled' }, true)).toBeNull();
    expect(nextOrderAction({ ...order, status: 'delivered' }, true)).toBeNull();
  });
});

describe('effective authenticated capability', () => {
  it('does not upgrade unknown roles to owner or assume manager permission', () => {
    expect(normalizeUserRole('unexpected')).toBe('unknown');
    expect(authenticatedOrderCapability({ role: 'unexpected' })).toBe(false);
    expect(authenticatedOrderCapability({ role: 'MANAGER' })).toBe(false);
    expect(authenticatedOrderCapability({ role: 'MOTORIZED' })).toBe(false);
    expect(authenticatedOrderCapability({ role: 'OWNER' })).toBe(true);
  });
  it('requires the effective view and change_status actions for operators', () => {
    const user = { role: 'WORKER', permissions: { modules: { operaciones: { enabled: true, actions: ['view', 'change_status'] } } } };
    expect(authenticatedOrderCapability(user)).toBe(true);
    expect(authenticatedOrderCapability({ ...user, permissions: { modules: { operaciones: { enabled: true, actions: ['view'] } } } })).toBe(false);
    expect(authenticatedOrderCapability({ ...user, permissions: { modules: { operaciones: { enabled: false, actions: [] } } } })).toBe(false);
  });
});

it('does not overwrite a newer server/socket result', () => {
  const current = { ...order, status: 'delivered' as const, updatedAt: '2026-10-23T15:05:00Z' };
  expect(mergeConfirmedOrder(current, { ...order, updatedAt: '2026-10-23T15:04:00Z' })).toEqual(current);
});
