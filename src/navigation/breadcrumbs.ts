import {
  AGILITO_PATH,
  buildRouteNav,
  getAliases,
  getTabRoots,
  isTabRootPath,
  normalizePath,
  type RouteNavConfig,
} from './appRouteRegistry';

export type { RouteNavConfig };

export interface BreadcrumbDef {
  key: string;
  path?: string;
}

/** @deprecated Use getAliases() — kept for any direct imports */
export const ALIASES: Record<string, string> = getAliases();

/** Tab roots — misma fuente que useAppNavigation */
export const TAB_ROOTS: Set<string> = getTabRoots();

/** Stack parents + crumbs — derivado del registry */
export const ROUTE_NAV: Record<string, RouteNavConfig> = buildRouteNav();

export function normalizeRoutePath(pathname: string): string {
  return normalizePath(pathname);
}

export function getRouteNav(pathname: string): RouteNavConfig | undefined {
  const key = normalizeRoutePath(pathname);
  return ROUTE_NAV[key];
}

export function isTabRoot(pathname: string): boolean {
  return isTabRootPath(pathname);
}

// Re-export for callers that imported AGILITO_PATH from here historically
export { AGILITO_PATH };
