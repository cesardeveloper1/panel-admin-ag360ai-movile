import { config } from '../config/env';
import {
  getAuthToken,
  notifySessionExpired,
  runWithRefreshLock,
  setAuthToken,
} from '../utils/authSession';
import {
  clearNativeRefreshToken,
  getClientInstanceId,
  getNativeRefreshToken,
  isNativeAuthClient,
  setNativeRefreshToken,
} from '../utils/nativeRefreshTokenStorage';

const BASE_URL = config.apiBaseUrl;
const CLIENT_INSTANCE_HEADER = 'X-Client-Instance';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/signin',
  '/auth/system/info',
  '/auth/verify-reset-token',
  '/auth/refresh',
  '/auth/logout',
  '/user-action-requests/complete-registration',
];

const shouldNotifySessionExpired = (url: string, status: number, token: string | null) => {
  if (status !== 401 || !token) return false;
  return !PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
};

export type RefreshAccessTokenResult = 'refreshed' | 'unauthorized' | 'unavailable';

let refreshPromise: Promise<RefreshAccessTokenResult> | null = null;

function readAccessToken(payload: unknown): string | null {
  return readAuthField(payload, 'accessToken');
}

function readAuthField(payload: unknown, field: 'accessToken' | 'refreshToken'): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const first = root.data && typeof root.data === 'object'
    ? root.data as Record<string, unknown>
    : root;
  const second = first.data && typeof first.data === 'object'
    ? first.data as Record<string, unknown>
    : first;
  const value = second[field];
  return typeof value === 'string' && value.trim() ? value : null;
}

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const statusCode = (error as Record<string, unknown>).statusCode;
  return typeof statusCode === 'number' ? statusCode : null;
}

export async function refreshAccessToken(): Promise<RefreshAccessTokenResult> {
  if (!refreshPromise) {
    refreshPromise = runWithRefreshLock(async () => {
      const payload = await fetchWithAuth(
        '/auth/refresh',
        { method: 'POST' },
        false,
      );
      const token = readAccessToken(payload);
      if (!token) return 'unavailable' as const;
      setAuthToken(token);
      return 'refreshed' as const;
    }).catch((error: unknown) => (
      readErrorStatus(error) === 401 ? 'unauthorized' : 'unavailable'
    )).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function fetchWithAuth(url: string, options: RequestOptions = {}, canRetry = true) {
  const { data, ...fetchOptions } = options;
  const token = getAuthToken();
  const nativeClient = isNativeAuthClient();
  const clientInstanceId = await getClientInstanceId();
  const isRefreshRequest = url.startsWith('/auth/refresh');
  const isLogoutRequest = url.startsWith('/auth/logout');
  const usesNativeRefreshToken = nativeClient && (isRefreshRequest || isLogoutRequest);
  const nativeRefreshToken = usesNativeRefreshToken
    ? await getNativeRefreshToken()
    : null;
  const requestData = nativeRefreshToken
    ? { ...(data && typeof data === 'object' ? data : {}), refreshToken: nativeRefreshToken }
    : data;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    [CLIENT_INSTANCE_HEADER]: clientInstanceId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(nativeClient && url.startsWith('/auth/')
      ? { 'x-auth-client': 'capacitor' }
      : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...fetchOptions,
    method: fetchOptions.method || 'GET',
    headers,
    body: requestData !== undefined ? JSON.stringify(requestData) : undefined,
    credentials: 'include',
  });

  const rawText = await response.text();
  let responseData: Record<string, unknown> | null = null;

  if (rawText.trim().length > 0) {
    try {
      responseData = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw {
        message: 'Respuesta JSON inválida del servidor',
        statusCode: response.status,
      };
    }
  }

  if (!response.ok) {
    if (shouldNotifySessionExpired(url, response.status, token) && canRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed === 'refreshed') return fetchWithAuth(url, options, false);
    }
    if (shouldNotifySessionExpired(url, response.status, token)) {
      notifySessionExpired();
    }

    throw {
      message:
        (typeof responseData?.message === 'string' && responseData.message) ||
        `Error del servidor: ${response.status}`,
      type: responseData?.type,
      statusCode: response.status,
      data: responseData?.data,
    };
  }

  if (nativeClient && (url.startsWith('/auth/signin') || isRefreshRequest)) {
    const rotatedRefreshToken = readAuthField(responseData, 'refreshToken');
    if (!rotatedRefreshToken) {
      throw new Error('El backend no devolvió el refresh token para Capacitor.');
    }
    await setNativeRefreshToken(rotatedRefreshToken);
  }

  if (nativeClient && isLogoutRequest) {
    await clearNativeRefreshToken();
  }

  return responseData;
}

export const api = {
  get: (url: string, options?: RequestOptions) =>
    fetchWithAuth(url, { ...options, method: 'GET' }),

  post: (url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithAuth(url, { ...options, method: 'POST', data }),

  put: (url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithAuth(url, { ...options, method: 'PUT', data }),

  patch: (url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithAuth(url, { ...options, method: 'PATCH', data }),

  delete: (url: string, data?: unknown, options?: RequestOptions) =>
    fetchWithAuth(url, { ...options, method: 'DELETE', data }),
};
