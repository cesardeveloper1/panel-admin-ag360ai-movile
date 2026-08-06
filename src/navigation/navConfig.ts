import {
  barChartOutline,
  cardOutline,
  gridOutline,
  notificationsOutline,
  sparklesOutline,
  logoWhatsapp,
} from 'ionicons/icons';
import {
  AGILITO_PATH,
  BUSINESS_PATHS,
  CHATS_PATH,
  NOTIFICATIONS_PATH,
  OPERATIONS_PATH,
  PAYMENTS_PATH,
  REPORTS_PATH,
  getRoute,
} from './appRouteRegistry';

export {
  AGILITO_PATH,
  BUSINESS_PATHS,
  BUSINESS_MODULE_PATHS,
  BUSINESS_HUB_PATH,
  CHATS_PATH,
  NOTIFICATIONS_PATH,
  OPERATIONS_PATH,
  PAYMENTS_PATH,
  PROFILE_PATH,
  REPORTS_PATH,
  getTabRoots,
  isTabRootPath,
  normalizePath,
} from './appRouteRegistry';

export interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  matchPaths?: string[];
}

function matchPathsFor(path: string, fallback: string[]): string[] {
  return getRoute(path)?.matchPaths ?? fallback;
}

/** Izquierda del FAB / sidebar: Reportes, Pedidos */
export const ownerNavLeft: NavItem[] = [
  {
    path: REPORTS_PATH,
    icon: barChartOutline,
    labelKey: 'nav.reports',
    matchPaths: matchPathsFor(REPORTS_PATH, [REPORTS_PATH]),
  },
  {
    path: OPERATIONS_PATH,
    icon: gridOutline,
    labelKey: 'nav.orders',
    matchPaths: matchPathsFor(OPERATIONS_PATH, [OPERATIONS_PATH]),
  },
];

/** Derecha: Agilito, Pagos (módulos de negocio bajo Pagos) */
export const ownerNavRight: NavItem[] = [
  {
    path: AGILITO_PATH,
    icon: sparklesOutline,
    labelKey: 'nav.agilito',
    matchPaths: matchPathsFor(AGILITO_PATH, [AGILITO_PATH]),
  },
  {
    path: PAYMENTS_PATH,
    icon: cardOutline,
    labelKey: 'nav.payments',
    matchPaths: matchPathsFor(PAYMENTS_PATH, [PAYMENTS_PATH, ...BUSINESS_PATHS]),
  },
];

export const ownerNavItems: NavItem[] = [...ownerNavLeft, ...ownerNavRight];

export const chatsNavItem: NavItem = {
  path: CHATS_PATH,
  icon: logoWhatsapp,
  labelKey: 'nav.chats',
  matchPaths: matchPathsFor(CHATS_PATH, [CHATS_PATH]),
};

/** Items de hamburguesa mobile: Agilito, Reportes, Ops, Chats, Pagos */
export const mobileNavItems: NavItem[] = [
  ownerNavRight[0],
  ...ownerNavLeft,
  chatsNavItem,
  ownerNavRight[1],
];

export const agilitoNavItem: NavItem = ownerNavRight[0];

export const alertsNavItem: NavItem = {
  path: NOTIFICATIONS_PATH,
  icon: notificationsOutline,
  labelKey: 'nav.alerts',
};

export function isNavActive(pathname: string, item: NavItem): boolean {
  const paths = item.matchPaths ?? [item.path];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
