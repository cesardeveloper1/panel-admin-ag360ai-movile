import { api } from './api';
import { parseListPage, type ListPage } from './listPage';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

export interface MadeReservation {
  id: string;
  reservationNumber: number;
  customerName?: string;
  phone?: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  status: ReservationStatus;
  zoneName?: string;
}

export interface ReservationListQuery {
  brandSubdomain: string;
  dateFrom: string;
  dateTo: string;
  branchId?: string;
  search?: string;
  status?: ReservationStatus;
  sourceChannel?: 'whatsapp' | 'instagram' | 'messenger';
  page?: number;
  limit?: number;
}

const isoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Semana lun–dom del calendario local, igual que el listado de Reservas del panel. */
export function currentReservationWeek(reference = new Date()): { dateFrom: string; dateTo: string } {
  const monday = new Date(reference);
  monday.setHours(12, 0, 0, 0);
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { dateFrom: isoDate(monday), dateTo: isoDate(sunday) };
}

export function formatReservationNumber(reservationNumber: number): string {
  const n = Math.trunc(reservationNumber);
  return `#${String(n).padStart(6, '0')}`;
}

const STATUSES = new Set<ReservationStatus>(['pending', 'confirmed', 'cancelled']);

export function parseMadeReservation(row: unknown): MadeReservation {
  if (!row || typeof row !== 'object') throw new Error('Invalid reservation');
  const item = row as Record<string, unknown>;
  const client = item.client && typeof item.client === 'object' ? item.client as Record<string, unknown> : {};
  const id = typeof item._id === 'string' ? item._id : '';
  const reservationNumber = item.reservationNumber;
  const partySize = item.partySize;
  const status = item.status;
  if (!id || typeof reservationNumber !== 'number' || !Number.isFinite(reservationNumber) || reservationNumber < 1) {
    throw new Error('Invalid reservation');
  }
  if (typeof partySize !== 'number' || !Number.isFinite(partySize) || partySize < 1) throw new Error('Invalid reservation');
  if (typeof item.reservationDate !== 'string' || !item.reservationDate || typeof item.reservationTime !== 'string' || !item.reservationTime) {
    throw new Error('Invalid reservation');
  }
  if (typeof status !== 'string' || !STATUSES.has(status as ReservationStatus)) throw new Error('Invalid reservation');
  const name = typeof client.name === 'string' ? client.name.trim() : '';
  const phone = typeof client.phone === 'string' ? client.phone.trim() : '';
  const zoneName = typeof item.zoneName === 'string' ? item.zoneName.trim() : '';
  return {
    id,
    reservationNumber: Math.trunc(reservationNumber),
    customerName: name || undefined,
    phone: phone || undefined,
    partySize: Math.trunc(partySize),
    reservationDate: item.reservationDate,
    reservationTime: item.reservationTime.length >= 5 ? item.reservationTime.slice(0, 5) : item.reservationTime,
    status: status as ReservationStatus,
    zoneName: zoneName || undefined,
  };
}

export const reservationService = {
  async list(query: ReservationListQuery): Promise<ListPage<MadeReservation>> {
    const subdomain = query.brandSubdomain.trim();
    if (!subdomain) throw new Error('brandSubdomain es obligatorio');
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const params = new URLSearchParams({
      brandSubdomain: subdomain,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: String(page),
      limit: String(limit),
      sortBy: 'reservationDate',
      sortDir: 'asc',
    });
    if (query.branchId?.trim()) params.set('branchId', query.branchId.trim());
    if (query.search?.trim()) params.set('search', query.search.trim());
    if (query.status) params.set('status', query.status);
    if (query.sourceChannel) params.set('sourceChannel', query.sourceChannel);
    const response = await api.get(`/reservations?${params.toString()}`);
    const parsed = parseListPage<unknown>(response, page, limit);
    return { ...parsed, data: parsed.data.map(parseMadeReservation) };
  },
};
