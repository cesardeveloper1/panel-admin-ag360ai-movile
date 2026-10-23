import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { OrderDetailSheet } from './OrderDetailSheet';
import { apiFacade } from '../services/apiFacade';
import type { Order } from '../types';
import '../i18n';

vi.mock('@ionic/react', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { IonModal: ({ children, isOpen }: { children?: ReactNode; isOpen: boolean }) => isOpen ? <div role="dialog">{children}</div> : null,
    IonContent: Box, IonFooter: Box, IonHeader: Box, IonTitle: Box, IonToolbar: Box, IonSpinner: Box,
    IonButton: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => <button disabled={disabled} onClick={onClick}>{children}</button> };
});
vi.mock('../services/apiFacade', () => ({ apiFacade: { getOrderDetail: vi.fn() } }));
const advanceOrder = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useApp', () => ({ useApp: () => ({
  brand: { id: 'brand', subdomain: 'demo', currency: { code: 'PEN' } }, authEpoch: 0,
  ordersFilters: {}, advanceOrder, canChangeOrders: true, orderMutations: {},
}) }));

const order: Order = { id: 'one', orderNumber: 'QA-001', brandId: 'brand', customerName: 'Cliente de prueba', customerKey: 'test',
  status: 'accepted', deliveryType: 'pickup', channel: 'whatsapp', total: 24, items: [{ nameKey: 'orders.item', name: 'Hamburguesa', qty: 1, price: 24 }], locationKey: 'ops.reliability.noInformation' };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiFacade.getOrderDetail).mockResolvedValue({ ...order, detailLoaded: true }); });

it('keeps the sheet open after a rejected operation, with no simulated AI control', async () => {
  const close = vi.fn();
  advanceOrder.mockResolvedValueOnce({ ok: false, reason: 'failed' });
  render(<OrderDetailSheet order={order} open onClose={close} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar a cocina' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Enviar a cocina' }));
  await waitFor(() => expect(advanceOrder).toHaveBeenCalledWith('one', 'accepted'));
  expect(close).not.toHaveBeenCalled();
  expect(screen.queryByText('Yape')).toBeNull();
  expect(screen.queryByRole('button', { name: 'IA' })).toBeNull();
});

it('closes only after a successful confirmed result', async () => {
  const close = vi.fn();
  let finish!: (result: unknown) => void;
  advanceOrder.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<OrderDetailSheet order={order} open onClose={close} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Enviar a cocina' }));
  expect(close).not.toHaveBeenCalled();
  finish({ ok: true, order: { ...order, status: 'in_kitchen' } });
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});

it('offers a detail retry without an operational CTA when detail loading fails', async () => {
  vi.mocked(apiFacade.getOrderDetail).mockRejectedValueOnce(new Error('offline'));
  render(<OrderDetailSheet order={order} open onClose={vi.fn()} />);
  expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Enviar a cocina' })).toBeNull();
});
