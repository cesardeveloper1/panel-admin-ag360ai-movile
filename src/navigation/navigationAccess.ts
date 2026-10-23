import type { UserSession } from '../types';
import { normalizePath, OPERATIONS_PATH, CHATS_PATH, REPORTS_PATH, AGILITO_PATH, PAYMENTS_PATH, PROFILE_PATH, NOTIFICATIONS_PATH } from './appRouteRegistry';

export type NavigationPermissions = { modules?: Record<string, { enabled?: boolean; actions?: string[] } | null> };
export function navigationAccess(role: UserSession['role'], permissions?: NavigationPermissions) {
  const operator = ['owner', 'superadmin', 'manager', 'worker'].includes(role);
  const bypass = role === 'owner' || role === 'superadmin';
  const grant = (module: string, action = 'view') => {
    const state = permissions?.modules?.[module];
    return operator && (bypass || (state?.enabled === true && (!state.actions?.length || state.actions.includes(action))));
  };
  const operations = grant('operaciones');
  const chats = operator && (bypass || (operations &&
    (permissions?.modules?.chats != null ? grant('chats') : grant('operaciones', 'view_chat_tab')) &&
    (permissions?.modules?.operaciones == null || grant('operaciones', 'view_chat_tab'))));
  return { operations, chats, reports: grant('reportes', 'view_dashboard'), agilito: grant('agente_ia'),
    products: grant('menu'), clients: grant('clientes') || grant('marketing'), locations: grant('locales'), brand: operator && bypass };
}

/** UI projection only: endpoints continue to authorize each resource. Delivery keeps its existing chrome. */
export function canNavigate(session: UserSession | null, path: string): boolean {
  if (!session) return false;
  const route = normalizePath(path.split('?')[0]);
  if (route === PROFILE_PATH || route === NOTIFICATIONS_PATH) return true;
  const caps = navigationAccess(session.role, session.permissions);
  if (route === OPERATIONS_PATH) return caps.operations;
  if (route === CHATS_PATH) return caps.chats;
  if (route === REPORTS_PATH) return caps.reports;
  if (route === AGILITO_PATH) return caps.agilito;
  if (route === PAYMENTS_PATH || route === '/app/business') return caps.products || caps.clients || caps.locations || caps.brand;
  if (route === '/app/products') return caps.products;
  if (route === '/app/clients') return caps.clients;
  if (route === '/app/locations') return caps.locations;
  if (route === '/app/datos-marca') return caps.brand;
  return false;
}

export function navigationLandingPath(session: UserSession | null): string {
  return [AGILITO_PATH, OPERATIONS_PATH, CHATS_PATH, REPORTS_PATH, PAYMENTS_PATH].find(path => canNavigate(session, path)) ?? PROFILE_PATH;
}
