/**
 * Variables de entorno Vite (prefijo VITE_).
 * apiBaseUrl ya incluye /api/v3 — los servicios NO deben repetir ese prefijo.
 */

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return fallback;
}

export const config = {
  environment:
    (import.meta.env.VITE_ENVIRONMENT as string | undefined)?.trim() ||
    import.meta.env.MODE,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v3',
  socketUrl: (import.meta.env.VITE_SOCKET_BASE_URL as string | undefined)?.trim() || '',
  devBackendUrl:
    (import.meta.env.VITE_DEV_BACKEND_URL as string | undefined)?.trim() ||
    'http://127.0.0.1:3002',
  /** Demo offline con apiMock. Default true hasta estabilizar 007+008. */
  useApiMock: parseBool(import.meta.env.VITE_USE_API_MOCK as string | undefined, true),
} as const;

export default config;
