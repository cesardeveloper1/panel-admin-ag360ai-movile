import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';

export type SupportedAppLanguage = 'es' | 'en';

export interface UserLanguageSettings {
  useOwnConfig: boolean;
  language: SupportedAppLanguage;
}

function withBrandId(path: string, brandId?: string): string {
  return brandId ? `${path}?brandId=${encodeURIComponent(brandId)}` : path;
}

function asLanguage(value: unknown): SupportedAppLanguage {
  return value === 'en' ? 'en' : 'es';
}

function mapSettings(response: unknown): UserLanguageSettings {
  const payload = unwrapApiPayload<Record<string, unknown>>(response);
  const ownConfig = payload?.ownConfig as Record<string, unknown> | undefined;
  return {
    useOwnConfig: ownConfig?.useOwnConfig === true,
    language: asLanguage(ownConfig?.language),
  };
}

export const userSettingsService = {
  async getLanguageSettings(brandId: string): Promise<UserLanguageSettings> {
    return mapSettings(await api.get(withBrandId('/auth/settings', brandId)));
  },

  async updateLanguageSettings(
    brandId: string,
    patch: Partial<UserLanguageSettings>,
  ): Promise<UserLanguageSettings> {
    return mapSettings(await api.patch(withBrandId('/auth/settings/appearance', brandId), patch));
  },
};
