import {
  KeychainAccess,
  SecureStorage,
} from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';

const REFRESH_TOKEN_KEY = 'refresh-token';
const CLIENT_INSTANCE_ID_KEY = 'client-instance-id';
const STORAGE_PREFIX = 'agiliza360.auth.';

let initialization: Promise<void> | null = null;
let clientInstanceId: string | null = null;

export function isNativeAuthClient(): boolean {
  return Capacitor.isNativePlatform();
}

async function initializeSecureStorage(): Promise<void> {
  if (!isNativeAuthClient()) return;

  if (!initialization) {
    initialization = Promise.all([
      SecureStorage.setKeyPrefix(STORAGE_PREFIX),
      SecureStorage.setSynchronize(false),
      SecureStorage.setDefaultKeychainAccess(
        KeychainAccess.whenUnlockedThisDeviceOnly,
      ),
    ]).then(() => undefined);
  }

  await initialization;
}

export async function getNativeRefreshToken(): Promise<string | null> {
  if (!isNativeAuthClient()) return null;
  await initializeSecureStorage();
  const token = await SecureStorage.getItem(REFRESH_TOKEN_KEY);
  return token?.trim() || null;
}

export async function setNativeRefreshToken(token: string): Promise<void> {
  if (!isNativeAuthClient()) return;
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new Error('El refresh token nativo no puede estar vacío.');
  }
  await initializeSecureStorage();
  await SecureStorage.setItem(REFRESH_TOKEN_KEY, normalizedToken);
}

export async function clearNativeRefreshToken(): Promise<void> {
  if (!isNativeAuthClient()) return;
  await initializeSecureStorage();
  await SecureStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Identifica una instalación de Capacitor o un perfil de navegador. No es una
 * credencial: borrar datos del sitio o reinstalar puede generar una instancia nueva.
 */
export async function getClientInstanceId(): Promise<string> {
  if (clientInstanceId) return clientInstanceId;

  if (isNativeAuthClient()) {
    await initializeSecureStorage();
    const existing = (await SecureStorage.getItem(CLIENT_INSTANCE_ID_KEY))?.trim();
    if (existing) {
      clientInstanceId = existing;
      return existing;
    }

    const next = generateClientInstanceId();
    await SecureStorage.setItem(CLIENT_INSTANCE_ID_KEY, next);
    clientInstanceId = next;
    return next;
  }

  try {
    const existing = window.localStorage.getItem(CLIENT_INSTANCE_ID_KEY)?.trim();
    if (existing) {
      clientInstanceId = existing;
      return existing;
    }

    const next = generateClientInstanceId();
    window.localStorage.setItem(CLIENT_INSTANCE_ID_KEY, next);
    clientInstanceId = next;
    return next;
  } catch {
    clientInstanceId = generateClientInstanceId();
    return clientInstanceId;
  }
}

function generateClientInstanceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
