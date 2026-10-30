import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DispatchOrderCard } from './DispatchQueue';
import type { Order } from '../../types';

const order: Order = {
  id: 'demo-order', orderNumber: '248', customerKey: 'demo', customerName: 'Cliente Demo',
  status: 'in_kitchen', channel: 'whatsapp', deliveryType: 'delivery', items: [], total: 10,
  brandId: 'demo', locationKey: 'demo', branchName: 'Local Demo', address: 'Dirección Demo',
};
afterEach(cleanup);
it('shows the order, pickup branch, customer and destination independently', () => {
  render(<DispatchOrderCard order={order} riderName="Rider Demo" />);
  for (const label of ['#248', 'Local Demo', 'Cliente Demo', 'Dirección Demo', 'Rider Demo']) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
});
it('keeps a stable identifier when the order number and customer are absent', () => {
  render(<DispatchOrderCard order={{ ...order, orderNumber: undefined, customerName: undefined }} />);
  expect(screen.getByText('demo-order')).toBeInTheDocument();
});
