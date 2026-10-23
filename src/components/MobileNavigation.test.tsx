import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { MobileNavigation } from './MobileNavigation';
import type { UserSession } from '../types';
import '../i18n';
const state = vi.hoisted(() => ({ tablet: false, keyboard: false, epoch: 0, role: 'owner', brand: { id: 'brand', displayName: 'QA' }, goRoot: vi.fn(), go: vi.fn(), switchBrand: vi.fn() }));
vi.mock('../hooks/useApp', () => ({ useApp: () => ({ session: { role: state.role } as UserSession, brand: state.brand, authEpoch: state.epoch, authRestoring: false, brandTransitioning: false, startBrandSwitch: state.switchBrand }) }));
vi.mock('../hooks/useAppNavigation', () => ({ useAppNavigation: () => ({ goRoot: state.goRoot, go: state.go }) }));
vi.mock('../hooks/useViewport', () => ({ useViewport: () => ({ isTablet: state.tablet }) }));
vi.mock('../hooks/useKeyboardVisible', () => ({ useKeyboardVisible: () => state.keyboard }));
vi.mock('@ionic/react', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { IonContent: Box, IonHeader: Box, IonToolbar: Box, IonIcon: () => <span />,
    IonModal: ({ children, isOpen }: { children?: ReactNode; isOpen: boolean }) => isOpen ? <div role="dialog">{children}</div> : null };
});
beforeEach(() => { state.tablet = false; state.keyboard = false; state.role = 'owner'; state.epoch = 0; vi.clearAllMocks(); });
afterEach(cleanup);
it('opens a single menu and exposes only three primary destinations', () => {
  render(<MemoryRouter initialEntries={['/app/operations']}><MobileNavigation /></MemoryRouter>);
  expect(screen.getAllByRole('navigation')).toHaveLength(1);
  expect(screen.getAllByRole('button')).toHaveLength(3);
  expect(screen.getByRole('button', { name: 'Operaciones' })).toHaveAttribute('aria-current', 'page');
  fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
  expect(screen.getAllByRole('dialog')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Mensajes rápidos' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('does not duplicate mobile navigation on tablet or cover the composer with the keyboard', () => {
  state.tablet = true;
  const { rerender } = render(<MemoryRouter initialEntries={['/app/chats']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
  state.tablet = false; state.keyboard = true;
  rerender(<MemoryRouter initialEntries={['/app/chats']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
});
it('keeps Agilito free of the bottom bar so its own menu can cover the screen', () => {
  render(<MemoryRouter initialEntries={['/app/agilito']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
});
it('keeps delivery chrome unchanged and closes the menu on a new session scope', () => {
  const { rerender } = render(<MemoryRouter initialEntries={['/app/operations']}><MobileNavigation /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
  state.epoch += 1;
  rerender(<MemoryRouter><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('dialog')).toBeNull();
  state.role = 'motorized'; rerender(<MemoryRouter><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
});
