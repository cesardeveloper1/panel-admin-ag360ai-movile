import type { ContactInfo } from '../types/contact';
import type { OperationsContext } from '../services/operationsContextService';

/** Only use the authorized account/attention relationship. Explicit null stays unassigned. */
export function contactAttentionLocation(contact: ContactInfo, context?: OperationsContext | null): string | undefined {
  if (!context || (contact.channel && contact.channel !== 'whatsapp')) return;
  const account = context.whatsappAccounts.find(item => item.identity.phoneNumberId === contact.channelAccountId);
  if (!account || account.coverage !== 'branch') return;
  const branchId = contact.attentionBranchId !== undefined ? contact.attentionBranchId : contact.branchId;
  if (!branchId || !account.branchIds.includes(branchId)) return;
  return context.branches.find(branch => branch.id === branchId)?.name.trim() || undefined;
}

export type ContactProgressField = 'name' | 'cart' | 'delivery' | 'payment';
export type ContactProgressState = 'received' | 'pending' | 'unknown';
const fields: ContactProgressField[] = ['name', 'cart', 'delivery', 'payment'];
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const items = (value: unknown) => Array.isArray(value) && value.some(item => {
  const row = record(item);
  return (text(row.productId) || text(row.productName) || text(row.name)) && typeof row.quantity === 'number' && row.quantity > 0;
});

/** Same data-collection semantics as panel; this does not confirm delivery or payment. */
export function contactProgress(contact: ContactInfo): { field: ContactProgressField; state: ContactProgressState }[] {
  const progress = contact.progress;
  if (progress && typeof progress.hasSession === 'boolean' && fields.every(field => typeof progress[field] === 'boolean')) {
    return fields.map(field => ({ field, state: progress[field] ? 'received' : progress.hasSession ? 'pending' : 'unknown' }));
  }
  const session = record(contact.sessionData);
  const hasSession = contact.sessionData != null && typeof contact.sessionData === 'object' && !Array.isArray(contact.sessionData);
  const received = {
    name: text(record(session.customerInfo).name) || text(contact.clientName),
    cart: items(record(session.cart).products) || items(record(session.order).items) || (contact.orderItemsSource === 'session' && items(contact.orderItems)),
    delivery: text(record(session.orderMode).mode),
    payment: text(record(session.paymentInfo).method),
  };
  return fields.map(field => ({ field, state: received[field] ? 'received' : hasSession ? 'pending' : 'unknown' }));
}
