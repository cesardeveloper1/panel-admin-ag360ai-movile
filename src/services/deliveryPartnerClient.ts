import { api } from './api';

export interface PartnerCoverageItem {
  countryCode: string;
  regionCodes?: string[];
  cityCodes: string[];
}

export interface PartnerNotificationGroup {
  wspGroupId: string;
  label?: string;
  branchIds: string[];
  isActive?: boolean;
}

export interface DeliveryPartner {
  _id: string;
  name: string;
  supervisor?: string;
  supervisorPhone?: string;
  ordersPhone?: string;
  startTime?: string;
  endTime?: string;
  yapePlin?: string;
  nameYapePlin?: string;
  coverage?: PartnerCoverageItem[];
  notificationGroups?: PartnerNotificationGroup[];
  updatedAt?: string;
}

export interface PartnerZonePoint {
  id?: string;
  latitude: number;
  longitude: number;
}

export interface PartnerZone {
  _id: string;
  name: string;
  coverageType?: string;
  polygonRoute?: PartnerZonePoint[];
  deliveryAmount?: number;
  estimatedDeliveryTime?: string;
  startTime?: string;
  endTime?: string;
  allowFreeDelivery?: boolean;
  isExclusion?: boolean;
  color?: string;
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return fallback;
}

export const deliveryPartnerClient = {
  async getMe(): Promise<DeliveryPartner | null> {
    const partner = unwrap<DeliveryPartner | null>(await api.get('/delivery-partners/delivery/me'));
    return partner?._id ? partner : null;
  },

  async updateMe(body: Partial<DeliveryPartner>): Promise<void> {
    await api.patch('/delivery-partners/delivery/me', body);
  },

  async getZones(): Promise<PartnerZone[]> {
    const data = unwrap<PartnerZone[] | { data?: PartnerZone[] }>(await api.get('/delivery-partners/delivery/me/zones'));
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.data) ? data.data : [];
  },

  async saveZone(zoneId: string | null, body: Record<string, unknown>): Promise<void> {
    if (zoneId) await api.patch(`/delivery-partners/delivery/me/zones/${encodeURIComponent(zoneId)}`, body);
    else await api.post('/delivery-partners/delivery/me/zones', body);
  },

  async deleteZone(zoneId: string): Promise<void> {
    await api.delete(`/delivery-partners/delivery/me/zones/${encodeURIComponent(zoneId)}`);
  },

  async getBranches(): Promise<Array<{ id: string; name: string }>> {
    const data = unwrap<Array<{ _id?: string; name?: string }>>(await api.get('/delivery-partners/delivery/me/branches'));
    const rows = Array.isArray(data) ? data : [];
    return rows.map((row) => ({ id: String(row._id ?? ''), name: row.name || String(row._id ?? '') })).filter((row) => row.id);
  },

  async listRiders(): Promise<Array<{ id: string; fullName: string; isActive?: boolean }>> {
    const data = unwrap<Array<{ id?: string; _id?: string; fullName?: string; isActive?: boolean }>>(
      await api.get('/delivery-partners/delivery/me/riders'),
    );
    const rows = Array.isArray(data) ? data : [];
    return rows
      .map((row) => ({ id: String(row.id ?? row._id ?? ''), fullName: row.fullName || '', isActive: row.isActive }))
      .filter((row) => row.id);
  },
};
