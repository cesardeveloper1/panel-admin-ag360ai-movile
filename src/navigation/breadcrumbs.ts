import { AGILITO_PATH, CHATS_PATH, PAYMENTS_PATH } from './navConfig';

export interface BreadcrumbDef {
  key: string;
  path?: string;
}

export interface RouteNavConfig {
  parent: string;
  crumbs: BreadcrumbDef[];
}

const ALIASES: Record<string, string> = {
  '/app/productos': '/app/products',
  '/app/marketing/clientes': '/app/clients',
  '/app/locales': '/app/locations',
  '/app/datos-marca': '/app/datos-marca',
  '/app/brand-data': '/app/datos-marca',
};

export const TAB_ROOTS = new Set([
  AGILITO_PATH,
  '/app/business',
  '/app/operations',
  '/app/reports',
  CHATS_PATH,
  PAYMENTS_PATH,
]);

export const ROUTE_NAV: Record<string, RouteNavConfig> = {
  '/app/products': {
    parent: PAYMENTS_PATH,
    crumbs: [
      { key: 'nav.payments', path: PAYMENTS_PATH },
      { key: 'menu.title' },
    ],
  },
  '/app/clients': {
    parent: PAYMENTS_PATH,
    crumbs: [
      { key: 'nav.payments', path: PAYMENTS_PATH },
      { key: 'marketing.title' },
    ],
  },
  '/app/locations': {
    parent: PAYMENTS_PATH,
    crumbs: [
      { key: 'nav.payments', path: PAYMENTS_PATH },
      { key: 'locationsPage.title' },
    ],
  },
  '/app/datos-marca': {
    parent: PAYMENTS_PATH,
    crumbs: [
      { key: 'nav.payments', path: PAYMENTS_PATH },
      { key: 'brandData.title' },
    ],
  },
  '/app/notifications': {
    parent: AGILITO_PATH,
    crumbs: [
      { key: 'nav.alerts' },
    ],
  },
  '/app/profile': {
    parent: AGILITO_PATH,
    crumbs: [{ key: 'settings.title' }],
  },
  '/app/onboarding': {
    parent: AGILITO_PATH,
    crumbs: [{ key: 'onboarding.title' }],
  },
};

export function normalizeRoutePath(pathname: string): string {
  const clean = pathname.replace(/\/$/, '') || '/';
  return ALIASES[clean] ?? clean;
}

export function getRouteNav(pathname: string): RouteNavConfig | undefined {
  const key = normalizeRoutePath(pathname);
  return ROUTE_NAV[key];
}

export function isTabRoot(pathname: string): boolean {
  return TAB_ROOTS.has(normalizeRoutePath(pathname));
}
