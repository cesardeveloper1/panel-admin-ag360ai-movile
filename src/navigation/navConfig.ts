import {
  barChartOutline,
  cardOutline,
  gridOutline,
  notificationsOutline,
  sparklesOutline,
} from 'ionicons/icons';

export const NOTIFICATIONS_PATH = '/app/notifications';
export const PROFILE_PATH = '/app/profile';
export const AGILITO_PATH = '/app/agilito';
export const PAYMENTS_PATH = '/app/payments';
export const CHATS_PATH = '/app/chats';

export const BUSINESS_PATHS = [
  '/app/business',
  '/app/products',
  '/app/productos',
  '/app/clients',
  '/app/marketing/clientes',
  '/app/locations',
  '/app/locales',
  '/app/datos-marca',
  '/app/brand-data',
];

export interface NavItem {
  path: string;
  icon: string;
  labelKey: string;
  matchPaths?: string[];
}

/** Izquierda del FAB: Reportes, Pedidos */
export const ownerNavLeft: NavItem[] = [
  { path: '/app/reports', icon: barChartOutline, labelKey: 'nav.reports' },
  {
    path: '/app/operations',
    icon: gridOutline,
    labelKey: 'nav.orders',
    matchPaths: ['/app/operations'],
  },
];

/** Derecha del FAB: Agilito, Pagos (módulos de negocio bajo Pagos) */
export const ownerNavRight: NavItem[] = [
  {
    path: AGILITO_PATH,
    icon: sparklesOutline,
    labelKey: 'nav.agilito',
    matchPaths: [AGILITO_PATH],
  },
  {
    path: PAYMENTS_PATH,
    icon: cardOutline,
    labelKey: 'nav.payments',
    matchPaths: [PAYMENTS_PATH, ...BUSINESS_PATHS],
  },
];

export const ownerNavItems: NavItem[] = [...ownerNavLeft, ...ownerNavRight];

export const chatsNavItem: NavItem = {
  path: CHATS_PATH,
  icon: 'logoWhatsapp',
  labelKey: 'nav.chats',
  matchPaths: [CHATS_PATH],
};

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
