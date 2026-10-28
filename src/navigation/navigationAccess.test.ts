import { expect, it } from 'vitest';
import { canNavigate, navigationAccess, navigationLandingPath } from './navigationAccess';
import type { UserSession } from '../types';
const manager: UserSession = { role: 'manager', email: 'qa@example.invalid', initials: 'QA', nameKey: 'test',
  permissions: { modules: { operaciones: { enabled: true, actions: ['view', 'view_chat_tab'] }, chats: { enabled: true, actions: ['view'] } } } };
it('uses verified grants for managers and preserves canonical and legacy chat denials', () => {
  expect(canNavigate(manager, '/app/operations')).toBe(true);
  expect(canNavigate(manager, '/app/quick-messages')).toBe(true);
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
  const motorized = { ...manager, role: 'motorized' as const };
  expect(canNavigate(motorized, '/app/operations')).toBe(true);
  expect(canNavigate(motorized, '/app/partner/zones')).toBe(true);
  expect(canNavigate(motorized, '/app/chats')).toBe(false);
  expect(canNavigate(motorized, '/app/reports')).toBe(false);
  expect(canNavigate(motorized, '/app/notifications')).toBe(false);
  expect(canNavigate(motorized, '/app/agilito')).toBe(false);
  expect(navigationLandingPath(motorized)).toBe('/app/operations');
  expect(canNavigate(manager, '/app/partner/account')).toBe(false);
});
it('keeps authorized aliases and chooses an authorized landing page', () => {
  expect(canNavigate({ ...manager, role: 'owner' }, '/app/productos')).toBe(true);
  expect(canNavigate(manager, '/app/products')).toBe(false);
  expect(navigationLandingPath(manager)).toBe('/app/operations');
  expect(navigationLandingPath({ ...manager, role: 'owner' })).toBe('/app/agilito');
  expect(navigationLandingPath({ ...manager, permissions: undefined })).toBe('/app/profile');
});

const menuGrant = { menu: { enabled: true, actions: ['view'] }, reportes: { enabled: true, actions: ['view_dashboard'] } };
it('keeps manager and worker screens inside the granted modules and the location mode', () => {
  const granted = { ...manager, permissions: { modules: { ...manager.permissions?.modules, ...menuGrant } } };
  const worker = { ...granted, role: 'worker' as const };
  const owner = { ...granted, role: 'owner' as const };
  expect(canNavigate(worker, '/app/reports/cancelled', { locations: 1 })).toBe(false);
  expect(canNavigate(worker, '/app/menu/integrations', { locations: 1 })).toBe(false);
  expect(canNavigate(granted, '/app/reports/cancelled', { locations: 1 })).toBe(true);
  expect(canNavigate(granted, '/app/menu/integrations', { locations: 1 })).toBe(true);
  expect(canNavigate(granted, '/app/products', { locations: 2 })).toBe(false);
  expect(canNavigate(granted, '/app/menu/categories', { locations: 2 })).toBe(false);
  expect(canNavigate(granted, '/app/menu/local', { locations: 2 })).toBe(true);
  expect(canNavigate(granted, '/app/products', { locations: 1 })).toBe(true);
  expect(canNavigate(granted, '/app/menu/categories', { locations: 1 })).toBe(true);
  expect(canNavigate(granted, '/app/menu/local', { locations: 1 })).toBe(false);
  expect(canNavigate({ ...manager, permissions: undefined }, '/app/menu/categories', { locations: 1 })).toBe(false);
  expect(canNavigate(owner, '/app/products', { locations: 2 })).toBe(true);
  expect(canNavigate(granted, '/app/datos-marca')).toBe(false);
});
it('keeps the platform console and brand NPS on superadmin', () => {
  const superadmin = { ...manager, role: 'superadmin' as const, permissions: undefined };
  const owner = { ...manager, role: 'owner' as const };
  expect(canNavigate(superadmin, '/app/platform')).toBe(true);
  expect(canNavigate(superadmin, '/app/platform/tower/connections')).toBe(true);
  expect(canNavigate(superadmin, '/app/marketing/nps')).toBe(true);
  expect(canNavigate(owner, '/app/platform')).toBe(false);
  expect(canNavigate(owner, '/app/marketing/nps')).toBe(false);
  expect(canNavigate(manager, '/app/platform/settings/brands')).toBe(false);
  expect(navigationLandingPath(superadmin)).toBe('/app/agilito');
});
