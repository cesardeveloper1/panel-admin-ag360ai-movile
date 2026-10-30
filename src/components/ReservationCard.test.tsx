import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReservationCard } from './ReservationCard';
import '../i18n';

afterEach(cleanup);

it('shows the made reservation without relying on color alone', () => {
  render(<ReservationCard reservation={{
    id: 'res-1', reservationNumber: 18, customerName: 'Ana', phone: '+51911111111', partySize: 4,
    reservationDate: '2026-10-31', reservationTime: '20:15', status: 'confirmed', zoneName: 'Terraza',
  }} />);
  expect(screen.getByRole('article', { name: 'Ana: Confirmada' })).toBeInTheDocument();
  expect(screen.getByText('#000018')).toBeInTheDocument();
  expect(screen.getByText('4 personas')).toBeInTheDocument();
  expect(screen.getByText('2026-10-31 · 20:15')).toBeInTheDocument();
  expect(screen.getByText('Terraza')).toBeInTheDocument();
});
