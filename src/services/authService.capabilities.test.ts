import { beforeEach, expect, it, vi } from 'vitest';
import { authService } from './authService';
import { api } from './api';

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../utils/authSession', () => ({ persistAuthSession: vi.fn() }));
vi.mock('../utils/nativeRefreshTokenStorage', () => ({ clearNativeRefreshToken: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });

it('treats a refresh 401 on a logged-out page as no session', async () => {
  vi.mocked(api.post).mockRejectedValueOnce({ statusCode: 401, message: 'Invalid refresh token' });
  await expect(authService.restoreSession()).resolves.toBeNull();
  expect(api.get).not.toHaveBeenCalled();
});

it('does not classify backend failures as an invalid session', async () => {
  const unavailable = { statusCode: 503, message: 'Unavailable' };
  vi.mocked(api.post).mockRejectedValueOnce(unavailable);
  await expect(authService.restoreSession()).rejects.toBe(unavailable);
});

it('uses the verified profile permissions rather than upgrading a worker to owner', async () => {
  vi.mocked(api.post).mockResolvedValueOnce({ data: { accessToken: 'synthetic-token', user: { email: 'test@example.invalid', role: 'OWNER' } } });
  vi.mocked(api.get).mockResolvedValueOnce({ data: { email: 'test@example.invalid', role: 'WORKER', permissions: { modules: { operaciones: { enabled: true, actions: ['view'] } } } } });
  const session = await authService.login('test@example.invalid', 'synthetic-password');
  expect(api.get).toHaveBeenCalledWith('/auth/me');
  expect(session).toMatchObject({ role: 'worker', capabilities: { changeOrderStatus: false } });
});
