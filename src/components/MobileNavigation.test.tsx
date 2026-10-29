import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MobileNavigation } from './MobileNavigation';
import type { UserSession } from '../types';
import '../i18n';

const state = vi.hoisted(() => ({
  tablet: false,
  keyboard: false,
  epoch: 0,
  role: 'owner',
  brand: { id: 'brand', displayName: 'QA' },
}));

vi.mock('../hooks/useApp', () => ({
  useApp: () => ({
    session: { role: state.role } as UserSession,
    brand: state.brand,
    authEpoch: state.epoch,
    authRestoring: false,
    brandTransitioning: false,
    startBrandSwitch: vi.fn(),
  }),
}));
vi.mock('../hooks/useAppNavigation', () => ({ useAppNavigation: () => ({ goRoot: vi.fn(), go: vi.fn() }) }));
vi.mock('../hooks/useViewport', () => ({ useViewport: () => ({ isTablet: state.tablet }) }));
vi.mock('../hooks/useKeyboardVisible', () => ({ useKeyboardVisible: () => state.keyboard }));

beforeEach(() => {
  state.tablet = false;
  state.keyboard = false;
  state.role = 'owner';
  state.epoch = 0;
  document.body.classList.add('ag-primary-nav-visible');
});
afterEach(() => {
  cleanup();
  document.body.classList.remove('ag-primary-nav-visible', 'ag-chat-thread-open');
});

it('does not render the phone footer', () => {
  render(<MemoryRouter initialEntries={['/app/operations']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(document.body.classList.contains('ag-primary-nav-visible')).toBe(false);
});

it('keeps the footer hidden on tablet, with the keyboard, and inside a chat', () => {
  state.tablet = true;
  const { rerender } = render(<MemoryRouter initialEntries={['/app/chats']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
  state.tablet = false;
  state.keyboard = true;
  rerender(<MemoryRouter initialEntries={['/app/chats']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
  document.body.classList.add('ag-chat-thread-open');
  rerender(<MemoryRouter initialEntries={['/app/chats']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
});

it('keeps Agilito and delivery roles without a footer', () => {
  const { rerender } = render(<MemoryRouter initialEntries={['/app/agilito']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
  state.role = 'motorized';
  rerender(<MemoryRouter initialEntries={['/app/operations']}><MobileNavigation /></MemoryRouter>);
  expect(screen.queryByRole('navigation')).toBeNull();
});
