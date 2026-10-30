import { expect, it, vi } from 'vitest';
import { api } from './api';
import { currentReservationWeek, formatReservationNumber, reservationService } from './reservationService';

vi.mock('./api', () => ({ api: { get: vi.fn() } }));

it('uses the Monday-Sunday week of the local calendar', () => {
  expect(currentReservationWeek(new Date(2026, 9, 30, 15))).toEqual({ dateFrom: '2026-10-26', dateTo: '2026-11-01' });
  expect(currentReservationWeek(new Date(2026, 10, 1, 8))).toEqual({ dateFrom: '2026-10-26', dateTo: '2026-11-01' });
});

it('asks the reservations list for the week, the branch and the status', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({
    data: [{
      _id: 'res-1', reservationNumber: 18, partySize: 4, reservationDate: '2026-10-31', reservationTime: '20:15:00',
      status: 'confirmed', zoneName: 'Terraza', client: { name: ' Ana ', phone: '+51911111111' },
    }],
    meta: { page: 1, total: 1, totalPages: 1 },
  });
  const result = await reservationService.list({
    brandSubdomain: 'smash', dateFrom: '2026-10-26', dateTo: '2026-11-01', branchId: 'norte', search: 'Ana', status: 'confirmed', page: 1,
  });
  const query = new URLSearchParams(String(vi.mocked(api.get).mock.calls.at(-1)?.[0]).split('?')[1]);
  expect(query.get('brandSubdomain')).toBe('smash');
  expect(query.get('dateFrom')).toBe('2026-10-26');
  expect(query.get('dateTo')).toBe('2026-11-01');
  expect(query.get('branchId')).toBe('norte');
  expect(query.get('status')).toBe('confirmed');
  expect(query.get('search')).toBe('Ana');
  expect(result.data[0]).toMatchObject({
    id: 'res-1', reservationNumber: 18, customerName: 'Ana', partySize: 4, reservationTime: '20:15', status: 'confirmed', zoneName: 'Terraza',
  });
  expect(formatReservationNumber(18)).toBe('#000018');
});

it('rejects a reservation without its number', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: [{ _id: 'res-2', partySize: 2, reservationDate: '2026-10-31', reservationTime: '13:00', status: 'pending', client: {} }], meta: { page: 1, total: 1 } });
  await expect(reservationService.list({ brandSubdomain: 'smash', dateFrom: '2026-10-26', dateTo: '2026-11-01' })).rejects.toThrow('Invalid reservation');
});
