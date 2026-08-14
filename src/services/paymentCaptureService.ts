import { config } from '../config/env';
import { api } from './api';

type PairingTicketEnvelope = {
  data?: { ticket?: unknown; expiresAt?: unknown };
  ticket?: unknown;
  expiresAt?: unknown;
};

export interface PairingTicket {
  ticket: string;
  expiresAt: string | null;
}

export const paymentCaptureService = {
  async createPairingTicket(branchId: string): Promise<PairingTicket> {
    const response = (await api.post('/payment-capture/pairing-tickets', { branchId })) as PairingTicketEnvelope;
    const payload = response.data ?? response;
    if (typeof payload.ticket !== 'string' || !payload.ticket.trim()) {
      throw new Error('PAIRING_TICKET_RESPONSE_INVALID');
    }
    return {
      ticket: payload.ticket.trim(),
      expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : null,
    };
  },

  trackerBaseUrl(): string {
    const value = config.tradingTrackerBaseUrl.trim();
    if (!value) throw new Error('TRADING_TRACKER_BASE_URL_MISSING');
    return value;
  },
};
