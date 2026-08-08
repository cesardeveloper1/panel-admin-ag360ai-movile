import { config } from '../config/env';
import { getAuthToken, notifySessionExpired } from '../utils/authSession';

const BASE_URL = config.apiBaseUrl;

interface RequestOptions extends RequestInit {
  data?: unknown;
}

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/signin',
  '/auth/system/info',
  '/auth/verify-reset-token',
  '/user-action-requests/complete-registration',
];

const shouldNotifySessionExpired = (url: string, status: number, token: string | null) => {
  if (status !== 401 || !token) return false;
  return !PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.startsWith(endpoint));
};

async function fetchWithAuth(url: string, options: RequestOptions = {}) {
  const { data, ...fetchOptions } = options;
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...fetchOptions,
    method: fetchOptions.method || 'GET',
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined,
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
  } else if (response.ok) {
    return null;
  }

  if (!response.ok) {
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
