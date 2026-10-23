import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { OperationsFilters } from './OperationsFilters';
import { getOperationsContext } from '../services/operationsContextService';
import '../i18n';
const apply = vi.hoisted(() => vi.fn());
const filters = vi.hoisted(() => ({ dateMode: 'today', dateFrom: '2026-10-23' }));
vi.mock('@ionic/react', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { IonModal: ({ children, isOpen }: { children?: ReactNode; isOpen: boolean }) => isOpen ? <div role="dialog">{children}</div> : null,
    IonContent: Box, IonFooter: Box, IonHeader: Box, IonToolbar: Box };
});
vi.mock('../hooks/useApp', () => ({ useApp: () => ({ brand: { id: 'b', subdomain: 'demo' }, authEpoch: 0,
  ordersFilters: filters, setOrdersFilters: apply }) }));
vi.mock('../services/operationsContextService', () => ({ getOperationsContext: vi.fn() }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getOperationsContext).mockResolvedValue({ brandId: 'b', branches: [{ id: 'one', name: 'Local autorizado' }], whatsappAccounts: [] }); });
it('keeps changes as draft until apply and uses the sole authorized local', async () => {
  render(<OperationsFilters open onClose={vi.fn()} mode="orders" />);
  await screen.findByText('Local autorizado');
  expect(screen.queryByRole('combobox', { name: 'Local de atención / entrega' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Todas las fechas' }));
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ dateMode: 'all', branchId: 'one' }));
});
it('does not apply unverified scope after a context failure', async () => {
  vi.mocked(getOperationsContext).mockRejectedValue(new Error('offline'));
  render(<OperationsFilters open onClose={vi.fn()} mode="orders" />);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled();
  expect(apply).not.toHaveBeenCalled();
});
it('rejects a context belonging to another brand', async () => {
  vi.mocked(getOperationsContext).mockResolvedValue({ brandId: 'other', branches: [{ id: 'foreign', name: 'Foreign' }], whatsappAccounts: [] });
  render(<OperationsFilters open onClose={vi.fn()} mode="orders" />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled());
  expect(screen.queryByText('Foreign')).toBeNull();
});
