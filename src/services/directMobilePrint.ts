import { thermalPrinter } from '../native/thermalPrinter';
import {
  isThermalPrintPayloadV1,
  ticketModeAccepts,
  type ThermalPrintPayloadV1,
} from '../types/mobilePrinting';

function stablePayloadHash(payload: ThermalPrintPayloadV1, ticketType: 'full' | 'kitchen'): string {
  const value = `${ticketType}:${JSON.stringify(payload)}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code || 'UNKNOWN_TRANSIENT');
  }
  return 'UNKNOWN_TRANSIENT';
}

export async function printThermalPayloadDirectly(input: {
  activeBrandId: string;
  branchId?: string;
  payload: unknown;
}): Promise<number> {
  if (!thermalPrinter.isNativeAvailable() || !isThermalPrintPayloadV1(input.payload)) return 0;

  const config = await thermalPrinter.getConfig();
  if (
    !config?.enabled ||
    config.brandId !== input.activeBrandId ||
    !input.branchId ||
    config.branchId !== input.branchId
  ) {
    return 0;
  }

  const ticketTypes = (['full', 'kitchen'] as const).filter((ticketType) =>
    ticketModeAccepts(config.ticketMode, ticketType),
  );
  let printed = 0;

  for (const ticketType of ticketTypes) {
    const jobId = [input.payload.orderId, input.payload.triggerStatus, ticketType, 'automatic'].join(':');
    const leaseId = 'direct-websocket';
    try {
      await thermalPrinter.printJob({
        jobId,
        leaseId,
        payloadHash: stablePayloadHash(input.payload, ticketType),
        ticketType,
        payload: input.payload,
      });
      await thermalPrinter.markCompleted(jobId, leaseId);
      printed += 1;
    } catch (error) {
      await thermalPrinter.markFailed(jobId, leaseId, errorCode(error)).catch(() => undefined);
      throw error;
    }
  }

  return printed;
}
