import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface PaymentCapturePermissionStatus {
  granted: boolean;
}

export interface PaymentCaptureDiagnostics {
  permissionGranted: boolean;
  listenerConnected: boolean;
  lastAcceptedAt: string | null;
  pendingCount: number;
  lastErrorCode: string | null;
  bindingState: 'unlinked' | 'linked' | 'blocked' | 'unlink_pending';
  deviceId: string | null;
  branchId: string | null;
  branchName: string | null;
  tokenExpiresAt: string | null;
  lastAckAt: string | null;
  deadLetterCount: number;
}

export interface PairDeviceInput {
  ticket: string;
  trackerBaseUrl: string;
}

export interface PairDeviceResult {
  deviceId: string;
  branchId: string | null;
  branchName: string | null;
}

export interface PaymentNotificationCapturedEvent {
  localEventId: string;
  capturedAt: string;
  pendingCount: number;
}

export const PAYMENT_PROVIDERS = ['yape', 'plin'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export interface PaymentProviderSetting {
  enabled: boolean;
  supported: boolean;
}

export type PaymentProviderSettings = Record<PaymentProvider, PaymentProviderSetting>;

export type PaymentCaptureLogState =
  | 'captured'
  | 'pending'
  | 'sending'
  | 'retry'
  | 'sent'
  | 'dead_letter';

export interface PaymentCaptureLog {
  localEventId: string;
  provider: PaymentProvider;
  capturedAt: string;
  state: PaymentCaptureLogState;
  attempts: number;
  sentAt: string | null;
  lastErrorCode: string | null;
  duplicate: boolean;
}

interface PaymentNotificationCapturePlugin {
  getPermissionStatus(): Promise<PaymentCapturePermissionStatus>;
  openNotificationListenerSettings(): Promise<void>;
  getDiagnostics(): Promise<PaymentCaptureDiagnostics>;
  pairDevice(input: PairDeviceInput): Promise<PairDeviceResult>;
  unlinkDevice(): Promise<void>;
  retryFailed(): Promise<{ retriedCount: number }>;
  getProviderSettings(): Promise<PaymentProviderSettings>;
  setProviderEnabled(input: { provider: PaymentProvider; enabled: boolean }): Promise<{
    provider: PaymentProvider;
    enabled: boolean;
  }>;
  getCaptureLogs(input: { limit: number }): Promise<{ logs: PaymentCaptureLog[] }>;
  addListener(
    eventName: 'paymentNotificationCaptured',
    listener: (event: PaymentNotificationCapturedEvent) => void,
  ): Promise<PluginListenerHandle>;
}

const nativePlugin = registerPlugin<PaymentNotificationCapturePlugin>('PaymentNotificationCapture');

function requireAndroid(): void {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('PAYMENT_NOTIFICATION_CAPTURE_ANDROID_ONLY');
  }
}

export const paymentNotificationCapture = {
  async getPermissionStatus(): Promise<PaymentCapturePermissionStatus> {
    requireAndroid();
    return nativePlugin.getPermissionStatus();
  },

  async getDiagnostics(): Promise<PaymentCaptureDiagnostics> {
    requireAndroid();
    return nativePlugin.getDiagnostics();
  },

  async openSettings(): Promise<void> {
    requireAndroid();
    await nativePlugin.openNotificationListenerSettings();
  },

  async pairDevice(input: PairDeviceInput): Promise<PairDeviceResult> {
    requireAndroid();
    return nativePlugin.pairDevice(input);
  },

  async unlinkDevice(): Promise<void> {
    requireAndroid();
    await nativePlugin.unlinkDevice();
  },

  async retryFailed(): Promise<number> {
    requireAndroid();
    const result = await nativePlugin.retryFailed();
    return result.retriedCount;
  },

  async getProviderSettings(): Promise<PaymentProviderSettings> {
    requireAndroid();
    return nativePlugin.getProviderSettings();
  },

  async setProviderEnabled(provider: PaymentProvider, enabled: boolean): Promise<void> {
    requireAndroid();
    await nativePlugin.setProviderEnabled({ provider, enabled });
  },

  async getCaptureLogs(limit = 50): Promise<PaymentCaptureLog[]> {
    requireAndroid();
    const result = await nativePlugin.getCaptureLogs({ limit });
    return result.logs;
  },

  async onCaptured(
    listener: (event: PaymentNotificationCapturedEvent) => void,
  ): Promise<PluginListenerHandle> {
    requireAndroid();
    return nativePlugin.addListener('paymentNotificationCaptured', listener);
  },
};
