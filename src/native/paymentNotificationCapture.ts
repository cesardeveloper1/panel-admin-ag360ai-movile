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

interface PaymentNotificationCapturePlugin {
  getPermissionStatus(): Promise<PaymentCapturePermissionStatus>;
  openNotificationListenerSettings(): Promise<void>;
  getDiagnostics(): Promise<PaymentCaptureDiagnostics>;
  pairDevice(input: PairDeviceInput): Promise<PairDeviceResult>;
  unlinkDevice(): Promise<void>;
  retryFailed(): Promise<{ retriedCount: number }>;
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

  async onCaptured(
    listener: (event: PaymentNotificationCapturedEvent) => void,
  ): Promise<PluginListenerHandle> {
    requireAndroid();
    return nativePlugin.addListener('paymentNotificationCaptured', listener);
  },
};
