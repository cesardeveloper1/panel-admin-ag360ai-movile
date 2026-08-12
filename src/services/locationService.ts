import { api } from './api';
import type { BranchLocation } from '../types';

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

type ApiEnvelope = { data?: unknown };

function unwrapData(response: unknown): unknown {
  const envelope = response as ApiEnvelope;
  return envelope?.data ?? response;
}

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

function readBranches(response: unknown, brandId: string): BranchLocation[] {
  const data = unwrapData(response);
  if (!Array.isArray(data)) return [];
  return data.map((branch) => mapBranch(branch as ApiBranch, brandId));
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
    const branch = unwrapData(response);
    if (!branch || typeof branch !== 'object') {
      throw new Error('La respuesta al crear el local no tiene el formato esperado.');
    }
    const created = mapBranch(branch as ApiBranch, input.brandId);
    if (!input.active && created.id) {
      const updated = await api.put(`/branch/${encodeURIComponent(created.id)}`, { status: false });
      return mapBranch(unwrapData(updated) as ApiBranch, input.brandId);
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
    const branch = unwrapData(response);
    if (!branch || typeof branch !== 'object') {
      throw new Error('La respuesta al actualizar el local no tiene el formato esperado.');
    }
    return mapBranch(branch as ApiBranch, input.brandId);
  },
};
