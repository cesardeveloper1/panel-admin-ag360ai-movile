import { expect, it } from 'vitest';
import { contactAttentionLocation, contactProgress } from './contactPresentation';
import type { ContactInfo } from '../types/contact';
import type { OperationsContext } from '../services/operationsContextService';
const contact: ContactInfo = { _id: 'chat', subDomain: 'qa', channel: 'whatsapp', channelAccountId: 'number-a', attentionBranchId: 'local-a', currentAgent: 'test', isActive: true, lastActivity: '', clientType: 'Client', conversationState: 'starting', unreadMessages: 0 };
const context: OperationsContext = { brandId: 'brand', branches: [{ id: 'local-a', name: 'Miraflores' }, { id: 'local-b', name: 'Surco' }], whatsappAccounts: [
  { id: 'a', coverage: 'branch', status: 'connected', isActive: true, branchIds: ['local-a'], identity: { phoneNumberId: 'number-a', phoneNumber: '+51900000000' } },
  { id: 'b', coverage: 'branch', status: 'connected', isActive: true, branchIds: ['local-b'], identity: { phoneNumberId: 'number-b' } },
  { id: 'shared', coverage: 'brand', status: 'connected', isActive: true, branchIds: [], identity: { phoneNumberId: 'shared' } },
] };
it('resolves attention by the actual receiving account, not the customer phone or order location', () => {
  expect(contactAttentionLocation({ ...contact, localId: 'local-b', sessionData: { orderMode: { branchId: 'local-b' } } }, context)).toBe('Miraflores');
  expect(contactAttentionLocation({ ...contact, channelAccountId: 'number-b', attentionBranchId: 'local-b' }, context)).toBe('Surco');
  expect(contactAttentionLocation({ ...contact, attentionBranchId: null, branchId: 'local-b' }, context)).toBeUndefined();
});
it('does not invent attention for shared numbers, another channel, missing or unauthorized context', () => {
  expect(contactAttentionLocation({ ...contact, channelAccountId: 'shared' }, context)).toBeUndefined();
  expect(contactAttentionLocation({ ...contact, channel: 'instagram' }, context)).toBeUndefined();
  expect(contactAttentionLocation(contact)).toBeUndefined();
  expect(contactAttentionLocation(contact, { ...context, branches: [] })).toBeUndefined();
  expect(contactAttentionLocation({ ...contact, channelAccountId: 'number-b' }, context)).toBeUndefined();
});
it('prefers the current backend projection over old session or CRM data', () => {
  expect(contactProgress({ ...contact, clientName: 'Old CRM', sessionData: { paymentInfo: { method: 'cash' } },
    progress: { hasSession: true, name: true, cart: false, delivery: false, payment: false } }).map(step => step.state)).toEqual(['received', 'pending', 'pending', 'pending']);
});
it('reads a partial reservation from flow and ignores order booleans on the same payload', () => {
  const steps = contactProgress({ ...contact, progress: {
    hasSession: true, flow: 'reservation', name: true, cart: true, delivery: true, payment: false,
    reservation: { name: true, party: false, schedule: false, zone: true },
  } });
  expect(steps.map(step => step.field)).toEqual(['name', 'party', 'schedule', 'zone']);
  expect(steps.map(step => step.state)).toEqual(['received', 'pending', 'pending', 'received']);
  expect(contactProgress({ ...contact, progress: {
    hasSession: false, flow: 'reservation', name: false, cart: false, delivery: false, payment: false,
    reservation: { name: true, party: false, schedule: false, zone: false },
  } }).map(step => step.state)).toEqual(['received', 'unknown', 'unknown', 'unknown']);
});
it('keeps the order row when flow is missing or the payload is an order', () => {
  expect(contactProgress({ ...contact, progress: { hasSession: true, name: false, cart: true, delivery: false, payment: false } }).map(step => step.field))
    .toEqual(['name', 'cart', 'delivery', 'payment']);
  expect(contactProgress({ ...contact, sessionData: { customerInfo: { name: 'Pedido' } }, progress: {
    hasSession: true, flow: 'order', name: false, cart: false, delivery: false, payment: false,
    reservation: { name: true, party: true, schedule: true, zone: true },
  } }).map(step => step.field)).toEqual(['name', 'cart', 'delivery', 'payment']);
});
it('uses only session items for fallback, without treating a historical order as a completed cart', () => {
  const result = contactProgress({ ...contact, sessionData: { customerInfo: { name: 'QA' }, orderMode: { mode: 'pickup' } }, orderItemsSource: 'lastOrder', orderItems: [{ name: 'Old order', quantity: 1 }] });
  expect(result.map(step => step.state)).toEqual(['received', 'pending', 'received', 'pending']);
  expect(contactProgress(contact).every(step => step.state === 'unknown')).toBe(true);
});
