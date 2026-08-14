import { getClientInstanceId } from '../utils/nativeRefreshTokenStorage';
import { thermalPrinter } from '../native/thermalPrinter';
import type {
  MobilePrintErrorCode,
  MobilePrinterConfig,
  MobilePrintServerJob,
} from '../types/mobilePrinting';
import {
  MOBILE_PRINT_ERROR_CODES,
  isThermalPrintPayloadV1,
  ticketModeAccepts,
} from '../types/mobilePrinting';
import { mobilePrintApi } from './mobilePrintApi';

type SyncReason = 'startup' | 'foreground' | 'socket' | 'configuration' | 'manual';

export interface MobilePrintSyncResult {
  processed: number;
  acknowledged: number;
  reason: SyncReason;
}

function readErrorCode(error: unknown): MobilePrintErrorCode {
  if (error && typeof error === 'object') {
    const value = (error as Record<string, unknown>).code;
    if (
      typeof value === 'string' &&
      MOBILE_PRINT_ERROR_CODES.includes(value as MobilePrintErrorCode)
    ) {
      return value as MobilePrintErrorCode;
    }
  }
  if (error instanceof Error && error.message === 'PAYLOAD_INVALID') {
    return 'PAYLOAD_INVALID';
  }
  return 'UNKNOWN_TRANSIENT';
}

class MobilePrintCoordinator {
  private activeRun: Promise<MobilePrintSyncResult> | null = null;
  private pendingRequest: { brandId: string; reason: SyncReason } | null = null;
  private stationId: string | null = null;
  private activeBrandId: string | null = null;

  sync(activeBrandId: string, reason: SyncReason): Promise<MobilePrintSyncResult> {
    this.activeBrandId = activeBrandId;
    this.pendingRequest = { brandId: activeBrandId, reason };
    if (!this.activeRun) {
      this.activeRun = this.drain().finally(() => {
        this.activeRun = null;
      });
    }
    return this.activeRun;
  }

  private async drain(): Promise<MobilePrintSyncResult> {
    let result: MobilePrintSyncResult = {
      processed: 0,
      acknowledged: 0,
      reason: 'manual',
    };
    while (this.pendingRequest) {
      const request = this.pendingRequest;
      this.pendingRequest = null;
      result = await this.run(request.brandId, request.reason);
    }
    return result;
  }

  async disableCurrentStation(): Promise<void> {
    if (!this.stationId) return;
    try {
      await mobilePrintApi.disableStation(this.stationId);
    } finally {
      this.stationId = null;
      this.activeBrandId = null;
    }
  }

  private async run(
    activeBrandId: string,
    reason: SyncReason,
  ): Promise<MobilePrintSyncResult> {
    if (!thermalPrinter.isNativeAvailable()) {
      return { processed: 0, acknowledged: 0, reason };
    }
    const config = await thermalPrinter.getConfig();
    if (!this.isRunnableConfig(config, activeBrandId)) {
      return { processed: 0, acknowledged: 0, reason };
    }

    const station = await mobilePrintApi.registerStation({
      installationId: await getClientInstanceId(),
      brandId: config.brandId,
      branchId: config.branchId,
      platform: thermalPrinter.platform() as 'android' | 'ios',
      capabilities: this.capabilitiesFor(config),
      enabled: true,
    });
    this.stationId = station.stationId;

    const acknowledged = await this.reconcilePendingAcks(station.stationId);
    let processed = 0;
    let cursor: string | undefined;

    do {
      const page = await mobilePrintApi.listJobs(station.stationId, cursor);
      for (const listedJob of page.jobs) {
        if (!ticketModeAccepts(config.ticketMode, listedJob.ticketType)) continue;
        const didProcess = await this.processJob(listedJob, station.stationId);
        if (didProcess) processed += 1;
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor && this.activeBrandId === activeBrandId);

    await mobilePrintApi.heartbeat(station.stationId);
    return { processed, acknowledged, reason };
  }

  private async reconcilePendingAcks(stationId: string): Promise<number> {
    const pending = await thermalPrinter.getPendingAcks();
    let acknowledged = 0;
    for (const local of pending) {
      if (!local.leaseId) continue;
      try {
        await mobilePrintApi.complete(local.jobId, stationId, local.leaseId);
        await thermalPrinter.markCompleted(local.jobId, local.leaseId);
        acknowledged += 1;
      } catch {
        try {
          const status = await mobilePrintApi.status(local.jobId, stationId);
          if (status.state === 'completed') {
            await thermalPrinter.markCompleted(local.jobId, local.leaseId);
            acknowledged += 1;
          }
        } catch {
          // Conservar printed_ack_pending. Nunca reimprimir por un fallo de ACK.
        }
      }
    }
    return acknowledged;
  }

  private async processJob(
    listedJob: MobilePrintServerJob,
    stationId: string,
  ): Promise<boolean> {
    let claimed: MobilePrintServerJob;
    try {
      claimed = await mobilePrintApi.claim(listedJob.jobId, stationId);
    } catch {
      return false;
    }
    if (!claimed.leaseId) return false;

    if (!isThermalPrintPayloadV1(claimed.payload)) {
      await this.reportFailure(claimed, stationId, 'PAYLOAD_INVALID');
      return true;
    }

    try {
      await thermalPrinter.printJob({
        jobId: claimed.jobId,
        leaseId: claimed.leaseId,
        payloadHash: claimed.payloadHash,
        ticketType: claimed.ticketType,
        payload: claimed.payload,
      });
    } catch (error) {
      await this.reportFailure(claimed, stationId, readErrorCode(error));
      return true;
    }

    try {
      await mobilePrintApi.complete(claimed.jobId, stationId, claimed.leaseId);
      await thermalPrinter.markCompleted(claimed.jobId, claimed.leaseId);
    } catch {
      // El plugin ya guardó printed_ack_pending; el siguiente sync solo reintenta el ACK.
    }
    return true;
  }

  private async reportFailure(
    job: MobilePrintServerJob,
    stationId: string,
    errorCode: MobilePrintErrorCode,
  ): Promise<void> {
    if (!job.leaseId) return;
    try {
      await mobilePrintApi.fail(job.jobId, stationId, job.leaseId, errorCode);
    } finally {
      await thermalPrinter.markFailed(job.jobId, job.leaseId, errorCode);
    }
  }

  private isRunnableConfig(
    config: MobilePrinterConfig | null,
    activeBrandId: string,
  ): config is MobilePrinterConfig {
    return Boolean(
      config?.enabled &&
        config.brandId === activeBrandId &&
        config.branchId &&
        config.deviceRef,
    );
  }

  private capabilitiesFor(config: MobilePrinterConfig): string[] {
    const ticketCapabilities =
      config.ticketMode === 'both'
        ? ['ticket:full', 'ticket:kitchen']
        : [`ticket:${config.ticketMode}`];
    return [`transport:${config.transport}`, `paper:${config.paperWidthMm}`, ...ticketCapabilities];
  }
}

export const mobilePrintCoordinator = new MobilePrintCoordinator();
