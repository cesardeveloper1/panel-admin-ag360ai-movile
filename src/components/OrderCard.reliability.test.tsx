import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../i18n';
import { OrderCard } from './OrderCard';
import { mapOrderFromApi } from '../services/mappers/orderMapper';

describe('real order identity', () => {
  it('does not invent a phone for a known demo customer name', () => {
    const order = mapOrderFromApi({ orderId: 'one', customerName: 'Test' }, 'brand')!;
    order.customerKey = 'customers.lucia';
    const { container } = render(<OrderCard order={order} />);
    expect(screen.getByText('Sin información')).toBeInTheDocument();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(order.paymentMethod).toBeUndefined();
  });

  it('preserves distinct canonical conversations for the same phone', () => {
    const one = mapOrderFromApi({ orderId: 'one', customerPhone: '123', agentStateId: 'state-a', channelAccountId: 'account-a', channel: 'whatsapp' }, 'brand')!;
    const two = mapOrderFromApi({ orderId: 'two', customerPhone: '123', agentStateId: 'state-b', channelAccountId: 'account-b', channel: 'whatsapp' }, 'brand')!;
    expect(one.agentStateId).not.toBe(two.agentStateId);
    expect(one.channelAccountId).not.toBe(two.channelAccountId);
    const { container } = render(<OrderCard order={one} />);
    expect(container.querySelector('a[href="tel:123"]')).not.toBeNull();
  });
});
