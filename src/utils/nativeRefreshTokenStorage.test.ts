import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  KeychainAccess: {
    whenUnlockedThisDeviceOnly: 1,
  },
  SecureStorage: {
    setKeyPrefix: vi.fn().mockResolvedValue(undefined),
    setSynchronize: vi.fn().mockResolvedValue(undefined),
    setDefaultKeychainAccess: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

import {
  KeychainAccess,
  SecureStorage,
} from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import {
  clearNativeRefreshToken,
  getClientInstanceId,
  getNativeRefreshToken,
  setNativeRefreshToken,
} from './nativeRefreshTokenStorage';

const isNativePlatform = vi.mocked(Capacitor.isNativePlatform);

describe('nativeRefreshTokenStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isNativePlatform.mockReturnValue(false);
  });

  it('no usa el plugin seguro en navegador', async () => {
    await expect(getNativeRefreshToken()).resolves.toBeNull();
    await setNativeRefreshToken('token-web-ignorado');
    await clearNativeRefreshToken();

    expect(SecureStorage.getItem).not.toHaveBeenCalled();
    expect(SecureStorage.setItem).not.toHaveBeenCalled();
    expect(SecureStorage.removeItem).not.toHaveBeenCalled();
  });

  it('guarda y elimina el refresh token en el almacén nativo', async () => {
    isNativePlatform.mockReturnValue(true);
    vi.mocked(SecureStorage.getItem).mockResolvedValue(' refresh-token ');

    await expect(getNativeRefreshToken()).resolves.toBe('refresh-token');
    await setNativeRefreshToken(' refresh-token-rotado ');
    await clearNativeRefreshToken();

    expect(SecureStorage.setKeyPrefix).toHaveBeenCalledWith('agiliza360.auth.');
    expect(SecureStorage.setSynchronize).toHaveBeenCalledWith(false);
    expect(SecureStorage.setDefaultKeychainAccess).toHaveBeenCalledWith(
      KeychainAccess.whenUnlockedThisDeviceOnly,
    );
    expect(SecureStorage.setItem).toHaveBeenCalledWith(
      'refresh-token',
      'refresh-token-rotado',
    );
    expect(SecureStorage.removeItem).toHaveBeenCalledWith('refresh-token');
  });

  it('creates the installation identifier in native secure storage', async () => {
    isNativePlatform.mockReturnValue(true);
    vi.mocked(SecureStorage.getItem).mockResolvedValue(null);

    const clientInstanceId = await getClientInstanceId();

    expect(clientInstanceId).toBeTruthy();
    expect(SecureStorage.setItem).toHaveBeenCalledWith(
      'client-instance-id',
      clientInstanceId,
    );
  });
});
