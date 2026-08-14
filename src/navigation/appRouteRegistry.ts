/**
 * Fuente única de rutas de la app autenticada.
 * navConfig, breadcrumbs, useAppNavigation y syncTabVisibility derivan de aquí.
 */

import {
  BUSINESS_MODULE_PATHS as CATALOG_MODULE_PATHS,
} from './businessModules';

export const NOTIFICATIONS_PATH = '/app/notifications';
export const PROFILE_PATH = '/app/profile';
export const AGILITO_PATH = '/app/agilito';
export const PAYMENTS_PATH = '/app/payments';
export const CHATS_PATH = '/app/chats';
export const REPORTS_PATH = '/app/reports';
export const OPERATIONS_PATH = '/app/operations';
export const BUSINESS_HUB_PATH = '/app/business';
export const PAYMENT_CAPTURE_PATH = '/app/payment-capture';
export const PRINTING_PATH = '/app/printing';

export type RouteKind = 'tab' | 'stack';

export interface AppRoute {
  path: string;
  kind: RouteKind;
  /** Parent for back when no Ionic history */
  parent?: string;
  /** Paths that highlight this nav item (tabs) */
  matchPaths?: string[];
  /** Alternate pathnames that normalize to path */
  aliases?: string[];
  /** CSS selector inside ion-page for syncTabVisibility */
  pageMarker?: string;
  /** If set, page must NOT match this selector to count as visible */
  pageMarkerExclude?: string;
  /** i18n title for crumbs / headers */
  titleKey?: string;
  /** i18n key for parent crumb label */
  crumbParentKey?: string;
}

/** Canonical business module paths — misma fuente que businessModules. */
export const BUSINESS_MODULE_PATHS = CATALOG_MODULE_PATHS;

/** True en Productos / Clientes / Locales / Datos de marca (y aliases). */
export function isBusinessModulePath(pathname: string): boolean {
  return BUSINESS_MODULE_PATHS.includes(normalizePath(pathname));
}

/** BUSINESS_MODULE_PATHS + legacy aliases (for nav matchPaths). */
export const BUSINESS_PATHS: string[] = [
  BUSINESS_HUB_PATH,
  ...BUSINESS_MODULE_PATHS,
  '/app/productos',
  '/app/marketing/clientes',
  '/app/locales',
  '/app/brand-data',
];

export const APP_ROUTES: AppRoute[] = [
  // —— Tabs ——
  {
    path: AGILITO_PATH,
    kind: 'tab',
    matchPaths: [AGILITO_PATH],
    pageMarker: '.agilito-layout',
    titleKey: 'nav.agilito',
  },
  {
    path: REPORTS_PATH,
    kind: 'tab',
    matchPaths: [REPORTS_PATH],
    pageMarker: '.reports-body',
    titleKey: 'nav.reports',
  },
  {
    path: OPERATIONS_PATH,
    kind: 'tab',
    matchPaths: [OPERATIONS_PATH],
    pageMarker: '.ops-body',
    titleKey: 'nav.orders',
  },
  {
    path: CHATS_PATH,
    kind: 'tab',
    matchPaths: [CHATS_PATH],
    pageMarker: '.chats-body',
    titleKey: 'nav.chats',
  },
  {
    path: PAYMENTS_PATH,
    kind: 'tab',
    matchPaths: [PAYMENTS_PATH, PAYMENT_CAPTURE_PATH, PRINTING_PATH, ...BUSINESS_PATHS],
    pageMarker: '.hub-grid',
    pageMarkerExclude: '.agilito-layout',
    titleKey: 'nav.payments',
  },
  {
    path: BUSINESS_HUB_PATH,
    kind: 'tab',
    matchPaths: [BUSINESS_HUB_PATH],
    titleKey: 'business.title',
  },

  // —— Stacks (business modules) ——
  {
    path: '/app/products',
    kind: 'stack',
    parent: PAYMENTS_PATH,
    aliases: ['/app/productos'],
    titleKey: 'menu.title',
    crumbParentKey: 'nav.payments',
  },
  {
    path: '/app/clients',
    kind: 'stack',
    parent: PAYMENTS_PATH,
    aliases: ['/app/marketing/clientes'],
    titleKey: 'marketing.title',
    crumbParentKey: 'nav.payments',
  },
  {
    path: '/app/locations',
    kind: 'stack',
    parent: PAYMENTS_PATH,
    aliases: ['/app/locales'],
    titleKey: 'locationsPage.title',
    crumbParentKey: 'nav.payments',
  },
  {
    path: '/app/datos-marca',
    kind: 'stack',
    parent: PAYMENTS_PATH,
    aliases: ['/app/brand-data'],
    titleKey: 'brandData.title',
    crumbParentKey: 'nav.payments',
  },

  // —— Other stacks ——
  {
    path: NOTIFICATIONS_PATH,
    kind: 'stack',
    parent: AGILITO_PATH,
    titleKey: 'nav.alerts',
  },
  {
    path: PROFILE_PATH,
    kind: 'stack',
    parent: AGILITO_PATH,
    titleKey: 'settings.title',
  },
  {
    path: PAYMENT_CAPTURE_PATH,
    kind: 'stack',
    parent: PAYMENTS_PATH,
    titleKey: 'paymentCapture.title',
  },
  {
    path: PRINTING_PATH,
    kind: 'stack',
    parent: PAYMENTS_PATH,
    titleKey: 'printing.title',
  },
  {
    path: '/app/onboarding',
    kind: 'stack',
    parent: AGILITO_PATH,
    titleKey: 'onboarding.title',
  },
];

const routesByPath = new Map(APP_ROUTES.map((r) => [r.path, r]));

/** alias → canonical path */
export function getAliases(): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const route of APP_ROUTES) {
    for (const alias of route.aliases ?? []) {
      aliases[alias] = route.path;
    }
  }
  // datos-marca is canonical; brand-data aliases to it (already in route.aliases)
  return aliases;
}

const ALIASES = getAliases();

export function normalizePath(pathname: string): string {
  const clean = pathname.replace(/\/$/, '') || '/';
  return ALIASES[clean] ?? clean;
}

export function getRoute(pathname: string): AppRoute | undefined {
  return routesByPath.get(normalizePath(pathname));
}

export function getTabRoots(): Set<string> {
  return new Set(APP_ROUTES.filter((r) => r.kind === 'tab').map((r) => r.path));
}

export function isTabRootPath(pathname: string): boolean {
  return getTabRoots().has(normalizePath(pathname));
}

export function getPageMarker(pathname: string): string | undefined {
  return getRoute(pathname)?.pageMarker;
}

export function pageMatchesRoute(page: Element, pathname: string): boolean {
  const route = getRoute(pathname);
  if (!route?.pageMarker) return false;
  if (!page.querySelector(route.pageMarker)) return false;
  if (route.pageMarkerExclude && page.querySelector(route.pageMarkerExclude)) return false;
  return true;
}

export interface RouteNavConfig {
  parent: string;
  crumbs: { key: string; path?: string }[];
}

/** Stack routes → parent + crumbs for useModuleNav / breadcrumbs */
export function buildRouteNav(): Record<string, RouteNavConfig> {
  const nav: Record<string, RouteNavConfig> = {};
  for (const route of APP_ROUTES) {
    if (route.kind !== 'stack' || !route.parent) continue;
    const crumbs: RouteNavConfig['crumbs'] = [];
    if (route.crumbParentKey) {
      crumbs.push({ key: route.crumbParentKey, path: route.parent });
    }
    if (route.titleKey) {
      crumbs.push({ key: route.titleKey });
    } else {
      crumbs.push({ key: route.path });
    }
    nav[route.path] = { parent: route.parent, crumbs };
  }
  return nav;
}
