import type { UserRole } from '../types';

const OPERATIONS_PATH = '/app/operations';
const PAYMENTS_PATH = '/app/payments';
const REPORTS_PATH = '/app/reports';

export type StaffScreenKind = 'list' | 'reservation' | 'report' | 'local' | 'agilink' | 'external';

export interface StaffScreen {
  path: string;
  titleKey: string;
  parent: string;
  kind: StaffScreenKind;
  module?: string;
  /** El trabajador no entra. */
  managerOnly?: boolean;
  /** Solo con un local asignado. */
  singleLocation?: boolean;
  /** Solo con varios locales asignados. */
  multiLocation?: boolean;
}

export const RESERVATION_CONFIG_PATH = '/app/reservations/config';
export const LOCAL_MENU_CONFIG_PATH = '/app/menu/local';

export const STAFF_SCREENS: readonly StaffScreen[] = [
  { path: RESERVATION_CONFIG_PATH, titleKey: 'staff.reservationConfig', parent: OPERATIONS_PATH, kind: 'reservation', module: 'reservaciones' },
  { path: '/app/reports/orders', titleKey: 'staff.reportOrders', parent: REPORTS_PATH, kind: 'report', module: 'reportes' },
  { path: '/app/reports/integration-sales', titleKey: 'staff.reportIntegration', parent: REPORTS_PATH, kind: 'report', module: 'reportes' },
  { path: '/app/reports/order-map', titleKey: 'staff.reportMap', parent: REPORTS_PATH, kind: 'report', module: 'reportes' },
  { path: '/app/reports/cash-close', titleKey: 'staff.reportCash', parent: REPORTS_PATH, kind: 'report', module: 'reportes' },
  { path: '/app/reports/cancelled', titleKey: 'staff.reportCancelled', parent: REPORTS_PATH, kind: 'report', module: 'reportes', managerOnly: true },
  { path: '/app/menu/categories', titleKey: 'staff.categories', parent: PAYMENTS_PATH, kind: 'list', module: 'menu', singleLocation: true },
  { path: '/app/menu/modifiers', titleKey: 'staff.modifiers', parent: PAYMENTS_PATH, kind: 'list', module: 'menu', singleLocation: true },
  { path: '/app/menu/groups', titleKey: 'staff.groups', parent: PAYMENTS_PATH, kind: 'list', module: 'menu', singleLocation: true },
  { path: '/app/menu/integrations', titleKey: 'staff.menuIntegrations', parent: PAYMENTS_PATH, kind: 'list', module: 'menu', singleLocation: true, managerOnly: true },
  { path: '/app/menu/digital', titleKey: 'staff.digitalMenu', parent: PAYMENTS_PATH, kind: 'external', module: 'carta_digital', singleLocation: true },
  { path: LOCAL_MENU_CONFIG_PATH, titleKey: 'staff.localConfig', parent: PAYMENTS_PATH, kind: 'local', module: 'menu', multiLocation: true },
  { path: '/app/marketing/templates', titleKey: 'staff.templates', parent: PAYMENTS_PATH, kind: 'list', module: 'marketing' },
  { path: '/app/marketing/campaigns', titleKey: 'staff.campaigns', parent: PAYMENTS_PATH, kind: 'list', module: 'marketing' },
  { path: '/app/marketing/complaints', titleKey: 'staff.complaints', parent: PAYMENTS_PATH, kind: 'list', module: 'clientes' },
  { path: '/app/marketing/branch-survey', titleKey: 'staff.branchSurvey', parent: PAYMENTS_PATH, kind: 'list', module: 'encuestas_local' },
  { path: '/app/locations/zones', titleKey: 'staff.zones', parent: PAYMENTS_PATH, kind: 'list', module: 'locales' },
  { path: '/app/locations/gallery', titleKey: 'staff.gallery', parent: PAYMENTS_PATH, kind: 'list', module: 'galeria' },
  { path: '/app/locations/integrations', titleKey: 'staff.locationIntegrations', parent: PAYMENTS_PATH, kind: 'list', module: 'locales' },
  { path: '/app/agilink', titleKey: 'staff.agilink', parent: PAYMENTS_PATH, kind: 'agilink', module: 'agilink' },
  { path: '/app/help', titleKey: 'staff.help', parent: PAYMENTS_PATH, kind: 'list' },
];

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'manager' || role === 'worker';
}

export function staffScreen(path: string): StaffScreen | undefined {
  return STAFF_SCREENS.find((screen) => screen.path === path);
}
