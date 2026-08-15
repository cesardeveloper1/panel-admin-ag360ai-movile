export const PRINTER_TRANSPORTS = ['tcp', 'bluetooth-classic'] as const;
export type PrinterTransport = (typeof PRINTER_TRANSPORTS)[number];
export type PrinterTicketMode = 'full' | 'kitchen' | 'both';
export type PrinterPaperWidth = 58 | 80;

export interface MobilePrinterConfig {
  enabled: boolean;
  brandId: string;
  branchId: string;
  branchName: string;
  transport: PrinterTransport;
  deviceRef: string;
  displayName: string;
  host?: string;
  port?: number;
  paperWidthMm: PrinterPaperWidth;
  ticketMode: PrinterTicketMode;
  copies: number;
}

export type LocalPrintState =
  | 'queued'
  | 'claimed'
  | 'printing'
  | 'printed_ack_pending'
  | 'completed'
  | 'retry_wait'
  | 'failed';

export interface LocalPrintJob {
  jobId: string;
  leaseId: string | null;
  payloadVersion: 1;
  payloadHash: string;
  ticketType: 'full' | 'kitchen';
  state: LocalPrintState;
  attempts: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ThermalPrintLineItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  modifiers?: string[];
  notes?: string;
}

export interface ThermalPrintPayloadV1 {
  version: 1;
  triggerStatus: 'PREORDER' | 'ACEPTED';
  orderId: string;
  orderNumber?: string;
  brandSubdomain: string;
  brandName?: string;
  branchName?: string;
  branchExternalId?: string;
  statusLabel: string;
  customerName?: string;
  customerPhone?: string;
  deliveryMode?: string;
  deliveryAddress?: string;
  deliveryAddressRef?: string;
  items: ThermalPrintLineItem[];
  productsSubtotal?: number;
  deliveryCost?: number;
  discountAmount?: number;
  total?: number;
  paymentLabel?: string;
  specialNotes?: string;
  summary?: string;
  createdAt?: string;
  currencySymbol?: string;
  printedAt: string;
  ticketConfig?: Record<string, unknown>;
}

export interface MobilePrintServerJob {
  jobId: string;
  brandId: string;
  branchId: string;
  ticketType: 'full' | 'kitchen';
  purpose: 'automatic';
  payloadVersion: 1;
  payloadHash: string;
  state: string;
  leaseId: string | null;
  leasedUntil: string | null;
  leaseVersion: number;
  attempts: number;
  nextAttemptAt: string | null;
  completedAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
  payload?: ThermalPrintPayloadV1;
}

export interface MobilePrintStation {
  stationId: string;
  brandId: string;
  branchId: string;
  platform: 'android' | 'ios';
  enabled: boolean;
  version: number;
}

export interface PrinterDevice {
  id: string;
  name: string;
  transport: PrinterTransport;
  paired: boolean;
  host?: string;
  port?: number;
}

export interface PrinterCapabilities {
  available: boolean;
  platform: 'android' | 'ios' | 'web';
  transports: PrinterTransport[];
  bluetoothPermission: 'granted' | 'denied' | 'not-required';
}

export interface NativePrintResult {
  jobId: string;
  state: 'printed_ack_pending';
  alreadyPrinted: boolean;
}

export const MOBILE_PRINT_ERROR_CODES = [
  'PRINTER_OFFLINE',
  'CONNECTION_FAILED',
  'PAPER_OUT',
  'COVER_OPEN',
  'PERMISSION_DENIED',
  'UNSUPPORTED_PRINTER',
  'PAYLOAD_INVALID',
  'PRINT_TIMEOUT',
  'UNKNOWN_TRANSIENT',
] as const;

export type MobilePrintErrorCode = (typeof MOBILE_PRINT_ERROR_CODES)[number];

export function isThermalPrintPayloadV1(value: unknown): value is ThermalPrintPayloadV1 {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  if (
    payload.version !== 1 ||
    !['PREORDER', 'ACEPTED'].includes(String(payload.triggerStatus)) ||
    typeof payload.orderId !== 'string' ||
    !payload.orderId ||
    typeof payload.brandSubdomain !== 'string' ||
    !payload.brandSubdomain ||
    typeof payload.statusLabel !== 'string' ||
    typeof payload.printedAt !== 'string' ||
    !Array.isArray(payload.items)
  ) {
    return false;
  }
  return payload.items.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const line = item as Record<string, unknown>;
    return (
      typeof line.name === 'string' &&
      line.name.length > 0 &&
      typeof line.quantity === 'number' &&
      line.quantity > 0
    );
  });
}

export function ticketModeAccepts(
  mode: PrinterTicketMode,
  ticketType: 'full' | 'kitchen',
): boolean {
  return mode === 'both' || mode === ticketType;
}
