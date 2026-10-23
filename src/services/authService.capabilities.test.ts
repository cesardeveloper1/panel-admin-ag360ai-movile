import { beforeEach, expect, it, vi } from 'vitest';
import { authService } from './authService';
import { api } from './api';

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../utils/authSession', () => ({ persistAuthSession: vi.fn() }));
vi.mock('../utils/nativeRefreshTokenStorage', () => ({ clearNativeRefreshToken: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); });

it('uses the verified profile permissions rather than upgrading a worker to owner', async () => {
  vi.mocked(api.post).mockResolvedValueOnce({ data: { accessToken: 'synthetic-token', user: { email: 'test@example.invalid', role: 'OWNER' } } });
  vi.mocked(api.get).mockResolvedValueOnce({ data: { email: 'test@example.invalid', role: 'WORKER', permissions: { modules: { operaciones: { enabled: true, actions: ['view'] } } } } });
  const session = await authService.login('test@example.invalid', 'synthetic-password');
  expect(api.get).toHaveBeenCalledWith('/auth/me');
  expect(session).toMatchObject({ role: 'worker', capabilities: { changeOrderStatus: false } });
});
