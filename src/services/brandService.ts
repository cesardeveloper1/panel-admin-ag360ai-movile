import { api } from './api';
import { asArray, unwrapApiPayload } from '../utils/apiPayload';
import type { Brand } from '../types';
import { mapBrandsFromApi, type ApiBrand } from './mappers/brandMapper';

/**
 * GET /brand/all — mismo contrato que panel-admin brandService.getAll.
 */
export const brandService = {
  async getAll(): Promise<Brand[]> {
    const response = await api.get('/brand/all');
    const payload = unwrapApiPayload<unknown>(response);
    const list = asArray<ApiBrand>(payload);
    return mapBrandsFromApi(list);
  },
};
