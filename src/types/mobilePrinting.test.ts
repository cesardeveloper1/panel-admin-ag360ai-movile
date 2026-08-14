import { describe, expect, it } from 'vitest';
import { isThermalPrintPayloadV1, ticketModeAccepts } from './mobilePrinting';

const validPayload = {
  version: 1,
  triggerStatus: 'ACEPTED',
  orderId: 'order-1',
  brandSubdomain: 'demo',
  statusLabel: 'Aceptado',
  items: [{ name: 'Hamburguesa', quantity: 2 }],
  printedAt: '2026-08-13T10:00:00.000Z',
};

describe('mobile printing payload contract', () => {
  it('accepts the versioned server payload', () => {
    expect(isThermalPrintPayloadV1(validPayload)).toBe(true);
  });

  it('rejects malformed or empty line items', () => {
    expect(isThermalPrintPayloadV1({ ...validPayload, version: 2 })).toBe(false);
    expect(isThermalPrintPayloadV1({ ...validPayload, items: [{ name: '', quantity: 1 }] })).toBe(false);
    expect(isThermalPrintPayloadV1({ ...validPayload, items: [{ name: 'Café', quantity: 0 }] })).toBe(false);
  });

  it('filters full and kitchen jobs according to the installation setting', () => {
    expect(ticketModeAccepts('both', 'full')).toBe(true);
    expect(ticketModeAccepts('both', 'kitchen')).toBe(true);
    expect(ticketModeAccepts('full', 'kitchen')).toBe(false);
    expect(ticketModeAccepts('kitchen', 'full')).toBe(false);
  });
});
