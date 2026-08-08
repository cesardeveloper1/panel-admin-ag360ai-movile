const AUTH_TOKEN_KEY = 'auth_token';
const USER_ROLE_KEY = 'user_role';
const USER_EMAIL_KEY = 'user_email';
const USER_ID_KEY = 'user_id';
const USER_NAME_KEY = 'user_name';

type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifySessionExpired(): void {
  clearAuthTokens();
  listeners.forEach((listener) => listener());
}

export function clearAuthTokens(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
}

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function persistAuthSession(input: {
  accessToken: string;
  email: string;
  role: string;
  userId?: string;
  fullName?: string;
}): void {
  localStorage.setItem(AUTH_TOKEN_KEY, input.accessToken);
  localStorage.setItem(USER_ROLE_KEY, input.role);
  localStorage.setItem(USER_EMAIL_KEY, input.email);
  if (input.userId) localStorage.setItem(USER_ID_KEY, input.userId);
  if (input.fullName) localStorage.setItem(USER_NAME_KEY, input.fullName);
}

export { AUTH_TOKEN_KEY, USER_ROLE_KEY };
