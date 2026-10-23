import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAppNavigation } from './useAppNavigation';
import { nextNavigationIntent } from '../navigation/navigationIntent';
const router = vi.hoisted(() => ({ push: vi.fn(), goBack: vi.fn(), canGoBack: vi.fn() }));
vi.mock('@ionic/react', () => ({ useIonRouter: () => router }));
vi.mock('react-router-dom', () => ({ useHistory: () => ({ goBack: vi.fn() }) }));
vi.mock('../utils/instantNavAnimation', () => ({ fadeNavAnimation: vi.fn(), instantNavAnimation: vi.fn() }));
function pages() {
  const outlet = document.createElement('ion-router-outlet');
  for (const path of ['/app/operations', '/app/chats', '/app/payments', '/app/products', '/app/agilito']) {
    const page = document.createElement('div'); page.className = 'ion-page'; page.dataset.agRoute = path; outlet.appendChild(page);
  }
  document.body.appendChild(outlet);
  return outlet;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); router.canGoBack.mockReturnValue(false);
  router.push.mockImplementation((path: string) => window.history.replaceState({}, '', path));
  window.history.replaceState({}, '', '/app/operations');
});
afterEach(() => { cleanup(); document.querySelector('ion-router-outlet')?.remove(); vi.useRealTimers(); });
it('alternates ten roots using replace and leaves only the active page visible', () => {
  const outlet = pages(); const { result } = renderHook(useAppNavigation);
  for (let index = 0; index < 10; index += 1) {
    const path = index % 2 ? '/app/operations' : '/app/chats';
    act(() => { result.current.goRoot(path, 'replace', true); vi.runAllTimers(); });
    expect(window.location.pathname).toBe(path);
    expect(outlet.querySelectorAll('.ion-page:not(.ion-page-hidden)')).toHaveLength(1);
    expect(outlet.querySelector('.ion-page:not(.ion-page-hidden)')?.getAttribute('data-ag-route')).toBe(path);
  }
  expect(router.push.mock.calls.every(call => call[1] === 'root' && call[2] === 'replace')).toBe(true);
});
it('does not let a delayed child-to-root navigation overtake a newer intent', () => {
  pages(); window.history.replaceState({}, '', '/app/products'); router.canGoBack.mockReturnValue(true);
  router.goBack.mockImplementation(() => window.history.replaceState({}, '', '/app/payments'));
  const { result } = renderHook(useAppNavigation);
  act(() => { result.current.goRoot('/app/agilito'); result.current.goRoot('/app/operations', 'replace', true); vi.runAllTimers(); });
  expect(window.location.pathname).toBe('/app/operations');
  expect(router.push.mock.calls.some(call => call[0] === '/app/agilito')).toBe(false);
});
it('pops a business detail to its parent and invalidates a pending destination on logout', () => {
  pages(); window.history.replaceState({}, '', '/app/products'); router.canGoBack.mockReturnValue(true);
  router.goBack.mockImplementation(() => window.history.replaceState({}, '', '/app/payments'));
  const { result } = renderHook(useAppNavigation);
  act(() => { result.current.back('/app/payments'); vi.runAllTimers(); });
  expect(window.location.pathname).toBe('/app/payments');
  window.history.replaceState({}, '', '/app/products');
  act(() => { result.current.goRoot('/app/agilito'); nextNavigationIntent(); window.history.replaceState({}, '', '/login'); vi.runAllTimers(); });
  expect(window.location.pathname).toBe('/login');
});

it('opens the persisted conversation as a child and returns to the operations root', () => {
  const outlet = pages(); const { result } = renderHook(useAppNavigation);
  act(() => { result.current.go('/app/chats?agentStateId=synthetic-session'); vi.runAllTimers(); });
  expect(window.location.search).toBe('?agentStateId=synthetic-session');
  expect(router.push.mock.calls[0].slice(0, 3)).toEqual(['/app/chats?agentStateId=synthetic-session', 'forward', 'push']);
  expect(outlet.querySelectorAll('.ion-page:not(.ion-page-hidden)')).toHaveLength(1);
  expect(outlet.querySelector('.ion-page:not(.ion-page-hidden)')?.getAttribute('data-ag-route')).toBe('/app/chats');
  router.canGoBack.mockReturnValue(true);
  router.goBack.mockImplementation(() => window.history.replaceState({}, '', '/app/operations'));
  act(() => { result.current.back('/app/operations'); vi.runAllTimers(); });
  expect(outlet.querySelector('.ion-page:not(.ion-page-hidden)')?.getAttribute('data-ag-route')).toBe('/app/operations');
});
