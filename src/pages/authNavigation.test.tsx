import { createContext, useContext, useState } from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import LoginPage from './LoginPage';
import WelcomePage from './WelcomePage';
import type { AppContextValue } from '../context/appContextInstance';
import type { UserSession } from '../types';
import '../i18n';

const mocks = vi.hoisted(() => ({ goRoot: vi.fn(), replace: vi.fn(), brands: vi.fn(async () => []) }));
const SessionContext = createContext<AppContextValue>(null!);
vi.mock('../hooks/useApp', () => ({ useApp: () => useContext(SessionContext) }));
// Ionic retains auth pages after leaving them. Keep them mounted here and change
// the actual Router location, rather than unmounting away the regression.
vi.mock('../hooks/useAppNavigation', () => ({ useAppNavigation: () => ({
  goRoot: (...args: unknown[]) => mocks.goRoot(...args),
  replace: (...args: unknown[]) => mocks.replace(...args), go: vi.fn(),
}) }));
vi.mock('../services/apiFacade', () => ({ apiFacade: { getBrands: () => mocks.brands() } }));
vi.mock('../services/credentialSaveService', () => ({ requestCredentialSave: vi.fn() }));
vi.mock('../components/NewBrandSheet', () => ({ default: () => null }));

afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
const rider = { email: 'rider@example.invalid', role: 'rider', initials: 'R', nameKey: 'Rider' } as UserSession;

it.each([
  ['rider', '/app/trip'], ['motorized', '/app/operations'],
  ['owner', '/welcome'], ['manager', '/welcome'], ['worker', '/welcome'],
] as const)('redirects %s login once to %s while keeping login cached', async (role, destination) => {
  const history = createMemoryHistory({ initialEntries: ['/login'] });
  mocks.goRoot.mockImplementation((path: string) => history.replace(path));
  function Harness() {
    const [session, setSession] = useState<UserSession | null>(null);
    return <SessionContext.Provider value={{ session, loading: false, showToast: vi.fn(),
      login: async () => { setSession({ ...rider, role }); return true; },
    } as unknown as AppContextValue}><LoginPage /></SessionContext.Provider>;
  }
  render(<Router history={history}><Harness /></Router>);
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: rider.email } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'synthetic-only' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Iniciar sesión' }).closest('form')!);
  await waitFor(() => expect(history.location.pathname).toBe(destination));
  expect(mocks.goRoot).toHaveBeenCalledTimes(1);
});

it.each(['rider', 'motorized'] as const)('keeps the cached welcome page inactive on profile for %s', async role => {
  const history = createMemoryHistory({ initialEntries: ['/app/profile'] });
  render(<Router history={history}><SessionContext.Provider value={{ session: { ...rider, role }, authRestoring: false,
    brand: null, brandLoading: false, authEpoch: 1, showToast: vi.fn(), clearBrand: vi.fn(),
  } as unknown as AppContextValue}><WelcomePage /></SessionContext.Provider></Router>);
  await waitFor(() => expect(mocks.brands).not.toHaveBeenCalled());
  expect(mocks.replace).not.toHaveBeenCalled();
  expect(mocks.goRoot).not.toHaveBeenCalled();
});
