import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { DeliveredOrdersList } from './DispatchQueue';
import type { Order } from '../../types';
import '../../i18n';
afterEach(cleanup);
it('explains an empty loaded history without showing a delivery count', () => {
  render(<DeliveredOrdersList orders={[]} />);
  expect(screen.getByRole('status')).toHaveTextContent('No hay entregados.');
  expect(screen.queryByText('Entregas cargadas')).not.toBeInTheDocument();
});
it('keeps delivered cards read-only and labels the loaded records', () => {
  const order: Order = {id:'demo',orderNumber:'248',customerName:'Cliente Demo',customerKey:'demo',status:'delivered',channel:'whatsapp',deliveryType:'delivery',items:[],total:20,brandId:'demo',locationKey:'demo',branchName:'Local Demo'};
  render(<DeliveredOrdersList orders={[order]} />);
  expect(screen.getByText('Entregas cargadas')).toBeInTheDocument();
  expect(screen.getByText('Entregado')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
