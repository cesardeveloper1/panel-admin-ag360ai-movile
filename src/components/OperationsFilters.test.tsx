import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OperationsFilters } from './OperationsFilters';
import { getOperationsContext } from '../services/operationsContextService';
import '../i18n';
const apply = vi.hoisted(() => vi.fn());
const filters = vi.hoisted(() => ({ dateMode: 'today', dateFrom: '2026-10-23' }));
vi.mock('../hooks/useApp', () => ({ useApp: () => ({ brand: { id: 'b', subdomain: 'demo' }, authEpoch: 0,
  ordersFilters: filters, setOrdersFilters: apply }) }));
vi.mock('../services/operationsContextService', () => ({ getOperationsContext: vi.fn() }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getOperationsContext).mockResolvedValue({ brandId: 'b', branches: [{ id: 'one', name: 'Local autorizado' }], whatsappAccounts: [] }); });
it('applies a date immediately and keeps the sole authorized local', async () => {
  render(<OperationsFilters panel="date" onClose={vi.fn()} mode="orders" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Todas las fechas' }));
  expect(apply).toHaveBeenCalledWith(expect.objectContaining({ dateMode: 'all', branchId: 'one' }));
});
it('shows the sole local without a selector', async () => {
  render(<OperationsFilters panel="local" onClose={vi.fn()} mode="orders" />);
  expect(await screen.findByText('Local autorizado')).toBeTruthy();
  expect(screen.queryByRole('combobox', { name: 'Local de atención / entrega' })).toBeNull();
});
it('does not offer the date filter in conversations', async () => {
  render(<OperationsFilters panel="date" onClose={vi.fn()} mode="funnel" />);
  await waitFor(() => expect(getOperationsContext).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: 'Todas las fechas' })).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
it('does not apply unverified scope after a context failure', async () => {
  vi.mocked(getOperationsContext).mockRejectedValue(new Error('offline'));
  render(<OperationsFilters panel="date" onClose={vi.fn()} mode="orders" />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Todas las fechas' })).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
it('rejects a context belonging to another brand', async () => {
  vi.mocked(getOperationsContext).mockResolvedValue({ brandId: 'other', branches: [{ id: 'foreign', name: 'Foreign' }], whatsappAccounts: [] });
  render(<OperationsFilters panel="local" onClose={vi.fn()} mode="orders" />);
  await screen.findByRole('alert');
  expect(screen.queryByText('Foreign')).toBeNull();
  expect(apply).not.toHaveBeenCalled();
});
