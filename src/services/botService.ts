import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';

export interface BotCtxState {
  isOn: boolean;
  lockedBySuperadmin: boolean;
  subDomain: string;
  updatedAt?: string;
}

interface BotCtxApiData {
  _id?: string;
  subDomain?: string;
  isOn?: boolean;
  lockedBySuperadmin?: boolean;
  updatedAt?: string;
}

function mapBotCtx(payload: BotCtxApiData | null | undefined, fallbackSub: string): BotCtxState {
  return {
    subDomain: payload?.subDomain || fallbackSub,
    isOn: payload?.isOn === true,
    lockedBySuperadmin: payload?.lockedBySuperadmin === true,
    updatedAt: payload?.updatedAt,
  };
}

/**
 * Bot global por marca — mismos endpoints que panel Operaciones (`botCtxService`).
 * - GET `/bot-ctx/:subDomain`
 * - PUT `/bot-ctx/is-on` `{ subDomain, isOn }`
 */
export const botService = {
  async getState(subDomain: string): Promise<BotCtxState> {
    const subdomain = subDomain.trim();
    if (!subdomain) {
      return { subDomain: '', isOn: false, lockedBySuperadmin: false };
    }
    try {
      const raw = await api.get(`/bot-ctx/${encodeURIComponent(subdomain)}`);
      const payload = unwrapApiPayload<BotCtxApiData>(raw);
      return mapBotCtx(payload, subdomain);
    } catch {
      // Sin contexto: default ON como panel ante error de lectura suave.
      return {
        subDomain: subdomain,
        isOn: true,
        lockedBySuperadmin: false,
      };
    }
  },

  async setEnabled(subDomain: string, isOn: boolean): Promise<BotCtxState> {
    const subdomain = subDomain.trim();
    if (!subdomain) {
      throw new Error('Falta subdomain de la marca');
    }
    const raw = await api.put('/bot-ctx/is-on', { subDomain: subdomain, isOn });
    const payload = unwrapApiPayload<BotCtxApiData>(raw);
    if (!payload) {
      throw new Error('No se pudo actualizar el bot');
    }
    return mapBotCtx(payload, subdomain);
  },
};
