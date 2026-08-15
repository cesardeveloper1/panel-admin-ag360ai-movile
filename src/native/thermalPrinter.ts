import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core';
import type {
  LocalPrintJob,
  MobilePrinterConfig,
  NativePrintResult,
  PrinterCapabilities,
  PrinterDevice,
  ThermalPrintPayloadV1,
} from '../types/mobilePrinting';

interface ThermalPrinterPlugin {
  getCapabilities(): Promise<PrinterCapabilities>;
  requestBluetoothPermissions(): Promise<PrinterCapabilities>;
  listDevices(): Promise<{ devices: PrinterDevice[] }>;
  scanNetwork(): Promise<{ devices: PrinterDevice[] }>;
  getConfig(): Promise<{ config: MobilePrinterConfig | null }>;
  saveConfig(input: { config: MobilePrinterConfig }): Promise<{ config: MobilePrinterConfig }>;
  clearConfig(): Promise<void>;
  testPrint(): Promise<void>;
  printJob(input: {
    jobId: string;
    leaseId: string;
    payloadHash: string;
    ticketType: 'full' | 'kitchen';
    payload: ThermalPrintPayloadV1;
  }): Promise<NativePrintResult>;
  getHistory(input: { limit: number }): Promise<{ jobs: LocalPrintJob[] }>;
  getPendingAcks(): Promise<{ jobs: LocalPrintJob[] }>;
  markCompleted(input: { jobId: string; leaseId: string }): Promise<void>;
  markFailed(input: {
    jobId: string;
    leaseId: string;
    errorCode: string;
  }): Promise<void>;
  addListener(
    eventName: 'printerStateChanged',
    listener: (job: LocalPrintJob) => void,
  ): Promise<PluginListenerHandle>;
}

const nativePlugin = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');

function requireNative(): void {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('NATIVE_PRINTING_UNAVAILABLE');
  }
}

export const thermalPrinter = {
  isNativeAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  platform(): 'android' | 'ios' | 'web' {
    const platform = Capacitor.getPlatform();
    return platform === 'android' || platform === 'ios' ? platform : 'web';
  },

  async getCapabilities(): Promise<PrinterCapabilities> {
    if (!Capacitor.isNativePlatform()) {
      return {
        available: false,
        platform: 'web',
        transports: [],
        bluetoothPermission: 'not-required',
      };
    }
    return nativePlugin.getCapabilities();
  },

  async requestBluetoothPermissions(): Promise<PrinterCapabilities> {
    requireNative();
    return nativePlugin.requestBluetoothPermissions();
  },

  async listDevices(): Promise<PrinterDevice[]> {
    requireNative();
    return (await nativePlugin.listDevices()).devices;
  },

  async scanNetwork(): Promise<PrinterDevice[]> {
    requireNative();
    return (await nativePlugin.scanNetwork()).devices;
  },

  async getConfig(): Promise<MobilePrinterConfig | null> {
    requireNative();
    return (await nativePlugin.getConfig()).config;
  },

  async saveConfig(config: MobilePrinterConfig): Promise<MobilePrinterConfig> {
    requireNative();
    return (await nativePlugin.saveConfig({ config })).config;
  },

  async clearConfig(): Promise<void> {
    requireNative();
    await nativePlugin.clearConfig();
  },

  async testPrint(): Promise<void> {
    requireNative();
    await nativePlugin.testPrint();
  },

  async printJob(input: {
    jobId: string;
    leaseId: string;
    payloadHash: string;
    ticketType: 'full' | 'kitchen';
    payload: ThermalPrintPayloadV1;
  }): Promise<NativePrintResult> {
    requireNative();
    return nativePlugin.printJob(input);
  },

  async getHistory(limit = 50): Promise<LocalPrintJob[]> {
    requireNative();
    return (await nativePlugin.getHistory({ limit })).jobs;
  },

  async getPendingAcks(): Promise<LocalPrintJob[]> {
    requireNative();
    return (await nativePlugin.getPendingAcks()).jobs;
  },

  async markCompleted(jobId: string, leaseId: string): Promise<void> {
    requireNative();
    await nativePlugin.markCompleted({ jobId, leaseId });
  },

  async markFailed(jobId: string, leaseId: string, errorCode: string): Promise<void> {
    requireNative();
    await nativePlugin.markFailed({ jobId, leaseId, errorCode });
  },

  async onStateChanged(
    listener: (job: LocalPrintJob) => void,
  ): Promise<PluginListenerHandle> {
    requireNative();
    return nativePlugin.addListener('printerStateChanged', listener);
  },
};
