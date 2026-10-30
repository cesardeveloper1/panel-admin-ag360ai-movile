import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PartnerRidersPage, { RiderPresenceCard } from './PartnerRidersPage';
import { deliveryPartnerClient } from '../../services/deliveryPartnerClient';
import '../../i18n';
vi.mock('../../components/layouts', () => ({ StackLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../services/deliveryPartnerClient', () => ({ deliveryPartnerClient: { listRiders: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('keeps failed loading distinct from no riders and supports retry', async () => {
  vi.mocked(deliveryPartnerClient.listRiders).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{id:'demo',fullName:'Rider Demo',presence:'online'}]);
  render(<PartnerRidersPage />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('heading', { name: 'Rider Demo' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it.each([['tracking', 'En viaje'], ['online', 'En turno'], ['off_hours', 'Fuera de horario'], ['logged_out', 'Sin seguimiento']] as const)('renders a presence label for %s', (presence, label) => {
  render(<RiderPresenceCard name="Rider Demo" presence={presence} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});
