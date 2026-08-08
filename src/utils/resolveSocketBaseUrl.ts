import { config } from '../config/env';

/**
 * Base Socket.IO (sin namespace).
 * - VITE_SOCKET_BASE_URL si está definida
 * - Si API es absoluta (.../api/v3) → host del backend
 * - Si API es relativa (/api/v3) → same-origin (proxy Vite /socket.io)
 */
export function resolveSocketBaseUrl(): string {
  const configured = config.socketUrl.trim().replace(/\/$/, '');
  if (configured) return configured;

  const api = config.apiBaseUrl.trim();
  if (/^https?:\/\//i.test(api)) {
    return api.replace(/\/api\/v3\/?$/i, '').replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return config.devBackendUrl.replace(/\/$/, '');
}
