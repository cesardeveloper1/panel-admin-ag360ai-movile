import type { UserRole, UserSession } from '../types';
import { persistAuthSession } from '../utils/authSession';
import { clearNativeRefreshToken } from '../utils/nativeRefreshTokenStorage';
import { api } from './api';

interface LoginUserPayload {
  id?: string;
  _id?: string;
  email: string;
  fullName?: string;
  role: string;
}

interface LoginDataPayload {
  user: LoginUserPayload;
  accessToken: string;
}

type CurrentUserPayload = LoginUserPayload;

function initialsFromName(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const local = email.split('@')[0] || 'U';
  return local.slice(0, 2).toUpperCase();
}

function normalizeRole(role: string): UserRole {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'superadmin') return 'superadmin';
  if (normalized === 'user') return 'owner';
  return 'owner';
}

function unwrapLoginData(response: unknown): LoginDataPayload | null {
  if (!response || typeof response !== 'object') return null;
  const root = response as Record<string, unknown>;

  const tryShape = (value: unknown): LoginDataPayload | null => {
    if (!value || typeof value !== 'object') return null;
    const obj = value as Record<string, unknown>;
    const accessToken = obj.accessToken;
    const user = obj.user;
    if (typeof accessToken !== 'string' || !user || typeof user !== 'object') return null;
    return { accessToken, user: user as LoginUserPayload };
  };

  // StdApiResponse / LoginResponse: { data: { user, accessToken } }
  const fromData = tryShape(root.data);
  if (fromData) return fromData;

  // ResponseInterceptor anidado: { success, data: { data: { user, accessToken } } }
  if (root.data && typeof root.data === 'object') {
    const nested = tryShape((root.data as Record<string, unknown>).data);
    if (nested) return nested;
  }

  return tryShape(root);
}

function mapToUserSession(email: string, data: LoginDataPayload): UserSession {
  const fullName = data.user.fullName?.trim() || email;
  const role = normalizeRole(String(data.user.role ?? 'owner'));
  return {
    email: data.user.email || email,
    nameKey: 'users.maria',
    displayName: fullName,
    initials: initialsFromName(fullName, email),
    role,
  };
}

function unwrapCurrentUser(response: unknown): CurrentUserPayload | null {
  if (!response || typeof response !== 'object') return null;
  const root = response as Record<string, unknown>;
  const data = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : root;
  const nested = data.data && typeof data.data === 'object' ? data.data as Record<string, unknown> : data;
  if (typeof nested.email !== 'string' || typeof nested.role !== 'string') return null;
  return nested as unknown as CurrentUserPayload;
}

export const authService = {
  login: async (email: string, password: string): Promise<UserSession | null> => {
    const response = await api.post('/auth/signin', { email, password });
    const data = unwrapLoginData(response);
    if (!data?.accessToken) return null;

    persistAuthSession({
      accessToken: data.accessToken,
    });

    return mapToUserSession(email, data);
  },

  restoreSession: async (): Promise<UserSession | null> => {
    const refreshResponse = await api.post('/auth/refresh');
    const refreshData = unwrapLoginData(refreshResponse);
    const accessToken = refreshData?.accessToken ?? (() => {
      if (!refreshResponse || typeof refreshResponse !== 'object') return null;
      const root = refreshResponse as Record<string, unknown>;
      const data = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : root;
      return typeof data.accessToken === 'string' ? data.accessToken : null;
    })();
    if (!accessToken) return null;

    persistAuthSession({ accessToken });
    const user = unwrapCurrentUser(await api.get('/auth/me'));
    if (!user) return null;
    return mapToUserSession(user.email, {
      accessToken,
      user,
    });
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      await clearNativeRefreshToken();
      persistAuthSession({ accessToken: '' });
    }
  },
};
