# PRP: Route registry (fuente única de navegación)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-06  
> **Status:** Done  
 
> **Depends on:** — (fundación)  
> **Branch target:** `develop`

---

## Goal

Una sola fuente de verdad (`appRouteRegistry`) para tabs, stacks, parents, aliases, `matchPaths` y markers de página, de la que deriven `navConfig`, `breadcrumbs`, `TAB_ROOT_PATHS` y `syncTabVisibility`.

Estado final: añadir un tab o módulo = **una entrada** en el registry; cero listas de paths pegadas a mano en 4 archivos.

## Why

- Hoy `navConfig`, `breadcrumbs.TAB_ROOTS`, `useAppNavigation.TAB_ROOT_PATHS` y `syncTabVisibility.TAB_MATCHERS` deben coincidir a mano.
- Cada ruta nueva (o cambio Pagos/Agilito) rompe fácil la navegación Ionic (pantallas fantasma).
- Necesario antes de más features de negocio en mobile.

## What

### User-visible
- Sin cambio de UX si se hace bien: mismos destinos, misma hamburguesa, mismo Volver.
- Productos/Marketing/Locales/Marca siguen marcando **Pagos** activo en la sidebar.

### Technical
- Crear registry tipado y reexportar APIs actuales para no romper imports.
- Migrar consumidores a leer del registry.
- Mantener `pushTabRoot` + `syncTabVisibility` (no eliminar workarounds en este PRP).

### Success Criteria
- [x] Un solo lugar define tabs + stacks + parents + aliases + matchPaths
- [x] `MobileSideNav` no duplica `matchPaths` de Pagos/negocio
- [x] `TAB_ROOT_PATHS` y `TAB_ROOTS` son la misma fuente
- [ ] Flujos manuales OK: Agilito↔Productos, Pagos↔Productos, hamburguesa a tabs
- [x] `npm run lint` + `npm run build` OK

---

## All Needed Context

### Documentation & References
```yaml
- file: AGENTS.md
  why: mobile-first; develop; motion quality

- file: src/navigation/navConfig.ts
  why: BUSINESS_PATHS, ownerNavLeft/Right, isNavActive, path constants

- file: src/navigation/breadcrumbs.ts
  why: TAB_ROOTS, ROUTE_NAV, ALIASES, getRouteNav, isTabRoot

- file: src/hooks/useAppNavigation.ts
  why: pushTabRoot, TAB_ROOT_PATHS duplicado

- file: src/utils/syncTabVisibility.ts
  why: TAB_MATCHERS por selectores CSS — deben salir del registry (pageMarker)

- file: src/components/MobileSideNav.tsx
  why: mobileModules con matchPaths locales duplicados

- file: src/components/SideNav.tsx
  why: ownerNavItems + go()

- file: src/App.tsx
  why: aliases de rutas (/productos, /locales, brand-data)
```

### Current Codebase Structure
```bash
src/navigation/
├── navConfig.ts        # paths + nav items + BUSINESS_PATHS
├── breadcrumbs.ts      # parents + aliases + TAB_ROOTS
└── moduleNavFrom.ts    # origen Agilito/Pagos al entrar a módulos

src/hooks/useAppNavigation.ts
src/utils/syncTabVisibility.ts
src/components/MobileSideNav.tsx
```

### Desired Structure
```bash
src/navigation/
├── appRouteRegistry.ts   # NEW: AppRoute[] + helpers (tabs, stacks, aliases, markers)
├── navConfig.ts          # thin: reexport NavItem UI lists derived from registry
├── breadcrumbs.ts        # thin: ROUTE_NAV / TAB_ROOTS / ALIASES derived
├── moduleNavFrom.ts      # unchanged behavior this PRP
└── index.ts              # optional barrel

src/utils/syncTabVisibility.ts  # matchers from registry.pageMarker
src/hooks/useAppNavigation.ts   # TAB_ROOT_PATHS from registry
src/components/MobileSideNav.tsx # items from registry / ownerNav*
```

### Known Gotchas
```ts
// CRITICAL: Ionic root+replace deja Productos visible encima → no tocar pushTabRoot aquí
// CRITICAL: BottomNav desactivado en AppShell; no reactivarlo
// CRITICAL: Pagos.matchPaths incluye BUSINESS_PATHS (no Agilito)
// CRITICAL: aliases en App.tsx Y breadcrumbs — unificar; App.tsx puede seguir con Route exact
//          pero ALIASES deben vivir solo en registry
// PATTERN: isNavActive(pathname, item) ya existe — no reinventar
// GOTCHA: syncTabVisibility usa selectores (.agilito-layout, .hub-grid). Preferir
//         pageMarker: CSS selector string en registry hasta PRP 004
```

---

## Implementation Blueprint

### Data Models
```ts
export type RouteKind = 'tab' | 'stack';

export interface AppRoute {
  path: string;
  kind: RouteKind;
  /** Parent tab/stack for back when no history */
  parent?: string;
  /** Paths that highlight this nav item */
  matchPaths?: string[];
  /** Alternate pathnames that normalize to path */
  aliases?: string[];
  /** CSS selector inside ion-page for syncTabVisibility */
  pageMarker?: string;
  /** i18n / crumbs */
  titleKey?: string;
  crumbParentKey?: string;
}

// Example entries:
// { path: AGILITO_PATH, kind: 'tab', matchPaths: [AGILITO_PATH], pageMarker: '.agilito-layout' }
// { path: PAYMENTS_PATH, kind: 'tab', matchPaths: [PAYMENTS_PATH, ...business], pageMarker: '.hub-grid' }
// { path: '/app/products', kind: 'stack', parent: PAYMENTS_PATH, aliases: ['/app/productos'], titleKey: 'menu.title' }
```

### Tasks (in execution order)
```yaml
Task 1: CREATE src/navigation/appRouteRegistry.ts
  - Definir AppRoute + APP_ROUTES con todos los tabs y stacks actuales
  - Helpers: getTabRoots(), getAliases(), getRoute(path), normalizePath(), getPageMarker(path)
  - BUSINESS_PATHS = stacks bajo Pagos (products, clients, locations, brand + aliases canónicos)

Task 2: MODIFY navConfig.ts
  - Importar constants/helpers del registry
  - ownerNavLeft/Right/chats construidos desde registry (icons + labelKeys pueden quedar aquí o en registry)
  - PRESERVE: exports públicos (AGILITO_PATH, isNavActive, ownerNavItems, …)

Task 3: MODIFY breadcrumbs.ts
  - TAB_ROOTS / ALIASES / ROUTE_NAV derivados del registry
  - PRESERVE: getRouteNav, isTabRoot, normalizeRoutePath signatures

Task 4: MODIFY useAppNavigation.ts
  - TAB_ROOT_PATHS = getTabRoots() del registry
  - PRESERVE: pushTabRoot / go / back behavior

Task 5: MODIFY syncTabVisibility.ts
  - TAB_MATCHERS construido desde pageMarker del registry
  - PRESERVE: syncTabVisibility(path) API

Task 6: MODIFY MobileSideNav.tsx
  - Usar ownerNavItems + chatsNavItem (o lista del registry) en vez de mobileModules locales
  - PRESERVE: UI hamburguesa, go(path), profile

Task 7: Smoke — lint/build + flujos nav manuales
```

### Pseudocode
```ts
// Task 5: sync from registry
export function syncTabVisibility(path: string) {
  const marker = getPageMarker(path);
  if (!marker) return;
  const outlet = document.querySelector('ion-router-outlet');
  outlet?.querySelectorAll(':scope > .ion-page').forEach((page) => {
    const show = !!page.querySelector(marker);
    (page as HTMLElement).classList.toggle('ion-page-hidden', !show);
    // ... aria-hidden / display como hoy
  });
}
```

### Integration Points
```yaml
ROUTES:
  - App.tsx aliases pueden quedar; idealmente documentar que deben coincidir con registry.aliases
NAV:
  - SideNav ya usa ownerNavItems + go — debe seguir funcionando sin cambios grandes
I18N:
  - No requerido salvo nuevas keys
```

---

## Validation Loop

### Level 1
```bash
npm run lint
npx tsc --noEmit
```

### Level 2
```bash
npm run test.unit -- --run
```

### Level 3
```bash
npm run build
npm run dev
# 390x844: Agilito → Menú → Productos → hamburguesa → Agilito (debe verse Agilito)
# Pagos → Menú → Productos → Volver → Pagos
# En Productos, item Pagos active en sidebar
```

---

## Final Checklist

- [x] Lint + tsc/build OK
- [x] Una sola fuente de paths/tabs/parents
- [x] MobileSideNav sin matchPaths duplicados
- [ ] Navegación Ionic sin regresión (smoke manual pendiente)
- [x] BottomNav sigue off
- [x] Mobile-first intacto

---

## Anti-Patterns to Avoid

- ❌ No crear un quinto archivo de paths “temporal”
- ❌ No cambiar UX de BottomNav on/off en este PRP
- ❌ No eliminar syncTabVisibility
- ❌ No hardcodear BUSINESS_PATHS otra vez en MobileSideNav

---

## Notes

- Confidence: **8/10**
- Siguiente: PRP 002 (catálogo businessModules) puede consumir `BUSINESS_PATHS` del registry
- Out of scope: IonTabs, borrar moduleNavFrom, HubGrid UI
