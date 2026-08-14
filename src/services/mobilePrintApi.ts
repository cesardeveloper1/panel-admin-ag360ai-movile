import { api } from './api';
import { unwrapApiPayload } from '../utils/apiPayload';
import type {
  MobilePrintErrorCode,
  MobilePrintServerJob,
  MobilePrintStation,
} from '../types/mobilePrinting';

interface JobListResponse {
  jobs: MobilePrintServerJob[];
  nextCursor: string | null;
}

export const mobilePrintApi = {
  async registerStation(input: {
    installationId: string;
    brandId: string;
    branchId: string;
    platform: 'android' | 'ios';
    capabilities: string[];
    enabled: boolean;
  }): Promise<MobilePrintStation> {
    return unwrapApiPayload<MobilePrintStation>(
      await api.post('/mobile-printing/stations/register', input),
    );
  },

  async heartbeat(stationId: string): Promise<void> {
    await api.patch(`/mobile-printing/stations/${encodeURIComponent(stationId)}/heartbeat`);
  },

  async disableStation(stationId: string): Promise<void> {
    await api.delete(`/mobile-printing/stations/${encodeURIComponent(stationId)}`);
  },

  async listJobs(stationId: string, cursor?: string): Promise<JobListResponse> {
    const params = new URLSearchParams({ stationId, limit: '50' });
    if (cursor) params.set('cursor', cursor);
    return unwrapApiPayload<JobListResponse>(
      await api.get(`/mobile-printing/jobs?${params.toString()}`),
    );
  },

  async claim(jobId: string, stationId: string): Promise<MobilePrintServerJob> {
    return unwrapApiPayload<MobilePrintServerJob>(
      await api.post(`/mobile-printing/jobs/${encodeURIComponent(jobId)}/claim`, {
        stationId,
      }),
    );
  },

  async complete(jobId: string, stationId: string, leaseId: string): Promise<void> {
    await api.post(`/mobile-printing/jobs/${encodeURIComponent(jobId)}/complete`, {
      stationId,
      leaseId,
    });
  },

  async fail(
    jobId: string,
    stationId: string,
    leaseId: string,
    errorCode: MobilePrintErrorCode,
  ): Promise<void> {
    await api.post(`/mobile-printing/jobs/${encodeURIComponent(jobId)}/fail`, {
      stationId,
      leaseId,
      errorCode,
    });
  },

  async status(jobId: string, stationId: string): Promise<MobilePrintServerJob> {
    const params = new URLSearchParams({ stationId });
    return unwrapApiPayload<MobilePrintServerJob>(
      await api.get(`/mobile-printing/jobs/${encodeURIComponent(jobId)}?${params}`),
    );
  },
};
