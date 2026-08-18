import { clearNativeRefreshToken } from './nativeRefreshTokenStorage';

const REFRESH_LOCK_KEY = 'agiliza:auth-refresh-lock';
const REFRESH_CHANNEL_NAME = 'agiliza:auth-refresh';
const REFRESH_LOCK_TTL_MS = 8_000;
const REFRESH_LOCK_WAIT_MS = 250;

const LEGACY_AUTH_KEYS = [
  'auth_token',
  'user_role',
  'user_email',
  'user_id',
  'user_name',
] as const;

type SessionExpiredListener = () => void;
type AuthTokenListener = (token: string | null) => void;

const listeners = new Set<SessionExpiredListener>();
const tokenListeners = new Set<AuthTokenListener>();
let accessToken: string | null = null;
let refreshChannel: BroadcastChannel | null = null;

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function onAuthTokenChanged(listener: AuthTokenListener): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

export function notifySessionExpired(): void {
  clearAuthTokens();
  listeners.forEach((listener) => listener());
}

/** El access token nunca se persiste: se pierde al cerrar/reload y se restaura con refresh. */
export function setAuthToken(token: string | null): void {
  const nextToken = token?.trim() || null;
  if (nextToken === accessToken) return;
  accessToken = nextToken;
  tokenListeners.forEach((listener) => listener(accessToken));
}

export function clearAuthTokens(): void {
  setAuthToken(null);
  void clearNativeRefreshToken().catch(() => undefined);
  if (typeof localStorage === 'undefined') return;
  LEGACY_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function getAuthToken(): string | null {
  return accessToken;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenExpirationMs(token: string | null): number | null {
  if (!token) return null;
  const expiration = decodeJwtPayload(token)?.exp;
  return typeof expiration === 'number' ? expiration * 1000 : null;
}

/** Alias transitorio para los servicios que ya usan este nombre. */
export function persistAuthSession(input: { accessToken: string }): void {
  setAuthToken(input.accessToken);
}

const createRefreshLockOwner = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getRefreshChannel = (): BroadcastChannel | null => {
  if (refreshChannel) return refreshChannel;
  if (typeof BroadcastChannel === 'undefined') return null;
  refreshChannel = new BroadcastChannel(REFRESH_CHANNEL_NAME);
  return refreshChannel;
};

const waitForRefreshLock = (): Promise<void> =>
  new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      window.removeEventListener('storage', onStorage);
      channel?.removeEventListener('message', onMessage);
      window.clearTimeout(timeoutId);
      resolve();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === REFRESH_LOCK_KEY) finish();
    };
    const onMessage = () => finish();
    const channel = getRefreshChannel();
    const timeoutId = window.setTimeout(finish, REFRESH_LOCK_WAIT_MS);
    window.addEventListener('storage', onStorage);
    channel?.addEventListener('message', onMessage, { once: true });
  });

/** Serializa la rotación entre pestañas sin incluir tokens en los mensajes. */
export async function runWithRefreshLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return operation();

  const owner = createRefreshLockOwner();
  const deadline = Date.now() + REFRESH_LOCK_TTL_MS * 2;

  while (Date.now() < deadline) {
    try {
      const current = JSON.parse(
        window.localStorage.getItem(REFRESH_LOCK_KEY) || 'null',
      ) as { owner?: string; expiresAt?: number } | null;
      if (!current?.expiresAt || current.expiresAt <= Date.now()) {
        window.localStorage.setItem(
          REFRESH_LOCK_KEY,
          JSON.stringify({ owner, expiresAt: Date.now() + REFRESH_LOCK_TTL_MS }),
        );
        const acquired = JSON.parse(
          window.localStorage.getItem(REFRESH_LOCK_KEY) || 'null',
        ) as { owner?: string } | null;
        if (acquired?.owner === owner) {
          try {
            return await operation();
          } finally {
            const latest = JSON.parse(
              window.localStorage.getItem(REFRESH_LOCK_KEY) || 'null',
            ) as { owner?: string } | null;
            if (latest?.owner === owner) window.localStorage.removeItem(REFRESH_LOCK_KEY);
            getRefreshChannel()?.postMessage({ type: 'refresh-finished' });
          }
        }
      }
    } catch {
      return operation();
    }

    await waitForRefreshLock();
  }

  return operation();
}
