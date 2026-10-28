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

  async getPolicy(subDomain: string): Promise<{
    isOn: boolean;
    lockedBySuperadmin: boolean;
    channels: Record<'whatsapp' | 'instagram' | 'messenger', { isOn: boolean }>;
  }> {
    const subdomain = subDomain.trim();
    const raw = await api.get(`/bot-ctx/${encodeURIComponent(subdomain)}`);
    const payload = unwrapApiPayload<{
      isOn?: boolean;
      lockedBySuperadmin?: boolean;
      channels?: Record<string, { isOn?: boolean }>;
    }>(raw);
    if (!payload) throw new Error('Invalid bot policy');
    const channel = (name: 'whatsapp' | 'instagram' | 'messenger') => ({
      isOn: payload?.channels?.[name]?.isOn !== false,
    });
    return {
      isOn: payload?.isOn !== false,
      lockedBySuperadmin: payload?.lockedBySuperadmin === true,
      channels: {
        whatsapp: channel('whatsapp'),
        instagram: channel('instagram'),
        messenger: channel('messenger'),
      },
    };
  },

  async setChannel(subDomain: string, channel: 'whatsapp' | 'instagram' | 'messenger', isOn: boolean): Promise<void> {
    await api.put('/bot-ctx/channel-status', { subDomain, channel, isOn });
  },

  async getAssistantScope(subDomain: string): Promise<{
    mode: 'per_branch' | 'shared';
    globalCanToggle: boolean;
    accounts: Array<{
      id: string;
      branchName: string | null;
      shared: boolean;
      isOn: boolean;
      effectiveIsOn: boolean;
      canToggle: boolean;
    }>;
  }> {
    const raw = await api.get(`/bot-ctx/assistant-scope?${new URLSearchParams({ subDomain })}`);
    const data = unwrapApiPayload<{
      mode?: string;
      globalCanToggle?: boolean;
      accounts?: Array<{
        id?: string;
        branchName?: string | null;
        shared?: boolean;
        isOn?: boolean;
        effectiveIsOn?: boolean;
        canToggle?: boolean;
      }>;
    }>(raw);
    if (!data || (data.mode !== 'per_branch' && data.mode !== 'shared') || typeof data.globalCanToggle !== 'boolean' || !Array.isArray(data.accounts)) {
      throw new Error('Invalid assistant scope');
    }
    return {
      mode: data.mode,
      globalCanToggle: data.globalCanToggle,
      accounts: data.accounts.flatMap((row) => (
        typeof row.id === 'string' && typeof row.isOn === 'boolean' && typeof row.canToggle === 'boolean'
          && typeof row.effectiveIsOn === 'boolean' && typeof row.shared === 'boolean'
          ? [{
            id: row.id,
            branchName: typeof row.branchName === 'string' ? row.branchName : null,
            shared: row.shared,
            isOn: row.isOn,
            effectiveIsOn: row.effectiveIsOn,
            canToggle: row.canToggle,
          }]
          : []
      )),
    };
  },

  async setAccountAssistant(subDomain: string, accountId: string, isOn: boolean): Promise<void> {
    await api.put(`/bot-ctx/accounts/${encodeURIComponent(accountId)}/assistant`, { subDomain, isOn });
  },
};
