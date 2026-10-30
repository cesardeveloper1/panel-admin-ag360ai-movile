import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PartnerAccountSummary } from './PartnerAccountPage';
import '../../i18n';
afterEach(cleanup);
it('shows partner hours, supervisor and coverage and opens editing', () => {
  const edit = vi.fn();
  render(<PartnerAccountSummary startTime="08:00" endTime="22:00" supervisor="Supervisor Demo" cities={['Lima', 'Callao']} onEdit={edit} />);
  expect(screen.getByText('08:00 – 22:00')).toBeInTheDocument();
  expect(screen.getByText('Supervisor Demo')).toBeInTheDocument();
  expect(screen.getByText('Lima, Callao')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  expect(edit).toHaveBeenCalledOnce();
});
it('does not show a shift status when working hours are not configured', () => {
  render(<PartnerAccountSummary startTime="" endTime="" supervisor="" cities={[]} onEdit={vi.fn()} />);
  expect(screen.queryByText('En turno')).not.toBeInTheDocument();
  expect(screen.queryByText('Fuera de horario')).not.toBeInTheDocument();
});
