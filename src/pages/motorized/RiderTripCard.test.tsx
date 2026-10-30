import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RiderTripCard } from './RiderTripCard';
import type { Order } from '../../types';
import '../../i18n';
const trip: Order = { id: 'demo', orderNumber: '248', customerKey: 'demo', customerName: 'Cliente Demo',
  branchName: 'Local Demo', address: 'Dirección Demo', addressReference: 'Puerta azul',
  status: 'on_the_way', channel: 'whatsapp', deliveryType: 'delivery', items: [], total: 25,
  brandId: 'demo', locationKey: 'demo', paymentMethod: 'cash', phone: '+51900000000' };
afterEach(cleanup);
it('shows destination, reference, cash collection and the delivery action on route', () => {
  const move = vi.fn();
  render(<RiderTripCard trip={trip} phase="route" when={null} pending={false} onMove={move} />);
  expect(screen.getByRole('heading', { name: 'Cliente Demo' })).toBeInTheDocument();
  expect(screen.getByText('Puerta azul')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:+51900000000');
  fireEvent.click(screen.getByRole('button'));
  expect(move).toHaveBeenCalledWith('delivered');
});
it('keeps waiting orders without pickup or delivery actions', () => {
  render(<RiderTripCard trip={trip} phase="waiting" when="30 oct" pending={false} onMove={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Local Demo' })).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('disables the next action while a status change is pending', () => {
  render(<RiderTripCard trip={trip} phase="kitchen" when={null} pending onMove={vi.fn()} />);
  expect(screen.getByRole('button')).toBeDisabled();
});
