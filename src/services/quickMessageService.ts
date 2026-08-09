import { unwrapApiPayload } from '../utils/apiPayload';
import { api } from './api';

export interface QuickMessage {
  _id: string;
  brandId: string;
  shortcut: string;
  text: string;
  images?: string[];
  isActive: boolean;
}

export interface QuickMessageListResult {
  data: QuickMessage[];
  total: number;
  page: number;
  limit: number;
}

export const quickMessageService = {
  async list(
    brandId: string,
    params: { page?: number; limit?: number; isActive?: boolean; search?: string } = {},
  ): Promise<QuickMessageListResult> {
    const id = brandId.trim();
    if (!id) return { data: [], total: 0, page: 1, limit: 100 };

    const qs = new URLSearchParams();
    qs.set('brandId', id);
    qs.set('page', String(params.page ?? 1));
    qs.set('limit', String(params.limit ?? 100));
    if (params.isActive !== undefined) qs.set('isActive', String(params.isActive));
    if (params.search?.trim()) qs.set('search', params.search.trim());

    const raw = await api.get(`/quick-message?${qs.toString()}`);
    const payload = unwrapApiPayload<QuickMessageListResult | QuickMessage[]>(raw);

    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length, page: 1, limit: payload.length };
    }
    if (payload && typeof payload === 'object' && Array.isArray(payload.data)) {
      return {
        data: payload.data,
        total: payload.total ?? payload.data.length,
        page: payload.page ?? 1,
        limit: payload.limit ?? 100,
      };
    }
    return { data: [], total: 0, page: 1, limit: 100 };
  },
};
