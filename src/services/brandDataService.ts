import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';
import type { BrandConfig } from '../types';

type SocialLink = { id?: string; nombre?: string; link?: string };
type ApiBrandData = { logo?: string; socialNetworks?: SocialLink[] | Record<string, string | undefined> };

function mapConfig(brandId: string, raw: ApiBrandData): BrandConfig {
  const social = { instagram: '', facebook: '', whatsapp: '' };
  if (Array.isArray(raw.socialNetworks)) {
    raw.socialNetworks.forEach((item) => {
      if (item.id === 'instagram' || item.id === 'facebook' || item.id === 'whatsapp') {
        social[item.id] = item.link?.trim() ?? '';
      }
    });
  } else if (raw.socialNetworks && typeof raw.socialNetworks === 'object') {
    for (const key of Object.keys(social) as Array<keyof typeof social>) {
      social[key] = raw.socialNetworks[key]?.trim() ?? '';
    }
  }
  return { brandId, logoUrl: raw.logo?.trim() ?? '', primaryColor: '#8746FF', secondaryColor: '#141A32', ...social };
}

function buildSocialNetworks(config: BrandConfig): SocialLink[] {
  return [
    { id: 'instagram', nombre: 'Instagram', link: config.instagram.trim() },
    { id: 'facebook', nombre: 'Facebook', link: config.facebook.trim() },
    { id: 'whatsapp', nombre: 'WhatsApp', link: config.whatsapp.trim() },
  ];
}

export const brandDataService = {
  async get(brandId: string): Promise<BrandConfig> {
    return mapConfig(brandId, unwrapApiPayload<ApiBrandData>(await api.get(`/brand/${encodeURIComponent(brandId)}`)));
  },

  async save(config: BrandConfig): Promise<BrandConfig> {
    const response = await api.patch(`/brand/${encodeURIComponent(config.brandId)}/settings`, {
      socialNetworks: buildSocialNetworks(config),
    });
    return mapConfig(config.brandId, unwrapApiPayload<ApiBrandData>(response));
  },
};
