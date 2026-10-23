import { expect, it } from 'vitest';
import { canNavigate, navigationAccess, navigationLandingPath } from './navigationAccess';
import type { UserSession } from '../types';
const manager: UserSession = { role: 'manager', email: 'qa@example.invalid', initials: 'QA', nameKey: 'test',
  permissions: { modules: { operaciones: { enabled: true, actions: ['view', 'view_chat_tab'] }, chats: { enabled: true, actions: ['view'] } } } };
it('uses verified grants for managers and preserves canonical and legacy chat denials', () => {
  expect(canNavigate(manager, '/app/operations')).toBe(true);
  expect(canNavigate(manager, '/app/chats')).toBe(true);
  expect(canNavigate({ ...manager, permissions: { modules: { ...manager.permissions?.modules, chats: { enabled: false } } } }, '/app/chats')).toBe(false);
  expect(navigationAccess('worker', { modules: { operaciones: { enabled: true, actions: ['view'] }, chats: { enabled: true, actions: ['view'] } } }).chats).toBe(false);
  expect(canNavigate({ ...manager, permissions: undefined }, '/app/operations')).toBe(false);
});
it('does not turn delivery or an unknown role into a general operator', () => {
  for (const role of ['motorized', 'unknown'] as const) {
    expect(navigationAccess(role, manager.permissions).operations).toBe(false);
    expect(navigationAccess(role, manager.permissions).chats).toBe(false);
  }
});
it('keeps authorized aliases and chooses an authorized landing page', () => {
  expect(canNavigate({ ...manager, role: 'owner' }, '/app/productos')).toBe(true);
  expect(canNavigate(manager, '/app/products')).toBe(false);
  expect(navigationLandingPath(manager)).toBe('/app/operations');
  expect(navigationLandingPath({ ...manager, role: 'owner' })).toBe('/app/agilito');
  expect(navigationLandingPath({ ...manager, permissions: undefined })).toBe('/app/profile');
});
