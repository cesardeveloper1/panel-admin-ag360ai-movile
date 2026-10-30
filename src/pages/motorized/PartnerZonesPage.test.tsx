import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PartnerZoneCard } from './PartnerZonesPage';
import '../../i18n';
vi.mock('./PartnerZoneMap', () => ({ PartnerZoneMap: () => null }));
afterEach(cleanup);
it('shows a free delivery amount and operating hours without hiding zero', () => {
  const open = vi.fn();
  render(<PartnerZoneCard zone={{_id:'demo',name:'Zona Demo',deliveryAmount:0,startTime:'08:00',endTime:'22:00'}} onOpen={open} />);
  expect(screen.getByText('08:00 – 22:00')).toBeInTheDocument();
  expect(screen.getByText(/0[.,]00/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(open).toHaveBeenCalledOnce();
});
it('does not invent delivery fees or hours when the zone has none', () => {
  render(<PartnerZoneCard zone={{_id:'demo',name:'Solo nombre'}} onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).toHaveTextContent('Solo nombre');
  expect(screen.getByRole('button').textContent).toBe('Solo nombre');
});
