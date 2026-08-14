import { api } from './api';
import type { BranchLocation } from '../types';
import { asArray, unwrapApiPayload } from '../utils/apiPayload';

export interface CreateLocationInput {
  brandId: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
}

export type LocationFormInput = Omit<CreateLocationInput, 'brandId'>;

export interface UpdateLocationInput extends LocationFormInput {
  id: string;
  brandId: string;
}

type ApiBranch = {
  _id?: string;
  id?: string;
  brandId?: string;
  name?: string;
  address?: string;
  phone?: string;
  status?: boolean;
};

function mapBranch(branch: ApiBranch, fallbackBrandId: string): BranchLocation {
  return {
    id: String(branch._id ?? branch.id ?? ''),
    brandId: String(branch.brandId ?? fallbackBrandId),
    name: String(branch.name ?? 'Local sin nombre'),
    address: String(branch.address ?? 'Dirección no registrada'),
    phone: String(branch.phone ?? '—'),
    active: branch.status !== false,
  };
}

export function readBranches(response: unknown, brandId: string): BranchLocation[] {
  const payload = unwrapApiPayload<unknown>(response);
  return asArray<ApiBranch>(payload).map((branch) => mapBranch(branch, brandId));
}

export const locationService = {
  async list(brandId: string): Promise<BranchLocation[]> {
    return readBranches(await api.get(`/branch/${encodeURIComponent(brandId)}`), brandId);
  },

  async create(input: CreateLocationInput): Promise<BranchLocation> {
    const response = await api.post(`/branch/${encodeURIComponent(input.brandId)}`, {
      basic: {
        name: input.name,
        address: input.address,
        phone: input.phone,
      },
    });
    const branch = unwrapApiPayload<unknown>(response);
    if (!branch || typeof branch !== 'object') {
      throw new Error('La respuesta al crear el local no tiene el formato esperado.');
    }
    const created = mapBranch(branch as ApiBranch, input.brandId);
    if (!input.active && created.id) {
      const updated = await api.put(`/branch/${encodeURIComponent(created.id)}`, { status: false });
      return mapBranch(unwrapApiPayload<ApiBranch>(updated), input.brandId);
    }
    return created;
  },

  async update(input: UpdateLocationInput): Promise<BranchLocation> {
    const response = await api.put(`/branch/${encodeURIComponent(input.id)}`, {
      basic: {
        name: input.name,
        address: input.address,
        phone: input.phone,
      },
      status: input.active,
    });
    const branch = unwrapApiPayload<unknown>(response);
    if (!branch || typeof branch !== 'object') {
      throw new Error('La respuesta al actualizar el local no tiene el formato esperado.');
    }
    return mapBranch(branch as ApiBranch, input.brandId);
  },
};
