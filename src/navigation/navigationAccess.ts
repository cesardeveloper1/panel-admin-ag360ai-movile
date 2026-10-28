import type { UserSession } from '../types';
import { normalizePath, OPERATIONS_PATH, CHATS_PATH, REPORTS_PATH, AGILITO_PATH, PAYMENTS_PATH, PROFILE_PATH, NOTIFICATIONS_PATH, QUICK_MESSAGES_PATH } from './appRouteRegistry';
import { isStaffRole, STAFF_SCREENS } from './staffScreens';
import { isMotorizedRole, MOTORIZED_PATHS } from './motorizedScreens';

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

export type NavigateContext = { locations?: number };

function staffModuleAllowed(session: UserSession, module: string | undefined): boolean {
  if (session.role === 'owner' || session.role === 'superadmin') return true;
  if (!isStaffRole(session.role)) return false;
  if (!module) return true;
  if (module === 'marketing') return grantModule(session, 'marketing') || grantModule(session, 'clientes');
  return grantModule(session, module);
}

function grantModule(session: UserSession, module: string): boolean {
  const state = session.permissions?.modules?.[module];
  return state?.enabled === true && (!state.actions?.length || state.actions.includes('view'));
}

function manyLocations(role: UserSession['role'], locations?: number): boolean {
  return isStaffRole(role) && (locations ?? 1) > 1;
}

/** UI projection only: endpoints continue to authorize each resource. Delivery keeps its existing chrome. */
export function canNavigate(session: UserSession | null, path: string, context?: NavigateContext): boolean {
  if (!session) return false;
  const route = normalizePath(path.split('?')[0]);
  if (route === PROFILE_PATH) return true;
  if (route === NOTIFICATIONS_PATH) return !isMotorizedRole(session.role);
  if (isMotorizedRole(session.role)) {
    return route === OPERATIONS_PATH || (MOTORIZED_PATHS as readonly string[]).includes(route);
  }
  const caps = navigationAccess(session.role, session.permissions);
  const staffScreen = STAFF_SCREENS.find((item) => item.path === route);
  if (staffScreen) {
    if (staffScreen.managerOnly && session.role === 'worker') return false;
    if (staffScreen.singleLocation && manyLocations(session.role, context?.locations)) return false;
    if (staffScreen.multiLocation && !manyLocations(session.role, context?.locations)) return false;
    if (staffScreen.module === 'clientes') return caps.clients;
    if (staffScreen.module === 'reportes') return caps.reports;
    return staffModuleAllowed(session, staffScreen.module);
  }
  if (route === OPERATIONS_PATH || route === QUICK_MESSAGES_PATH) return caps.operations;
  if (route === CHATS_PATH) return caps.chats;
  if (route === REPORTS_PATH) return caps.reports;
  if (route === AGILITO_PATH) return caps.agilito;
  if (route === PAYMENTS_PATH || route === '/app/business') {
    return caps.products || caps.clients || caps.locations || caps.brand || STAFF_SCREENS.some((item) => canNavigate(session, item.path, context));
  }
  if (route === '/app/products') return caps.products && !manyLocations(session.role, context?.locations);
  if (route === '/app/clients') return caps.clients;
  if (route === '/app/locations') return caps.locations;
  if (route === '/app/datos-marca') return caps.brand;
  return false;
}

export function navigationLandingPath(session: UserSession | null): string {
  if (isMotorizedRole(session?.role)) return OPERATIONS_PATH;
  return [AGILITO_PATH, OPERATIONS_PATH, CHATS_PATH, REPORTS_PATH, PAYMENTS_PATH].find(path => canNavigate(session, path)) ?? PROFILE_PATH;
}
