# PRP: [Feature Name]

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** [Date]  
> **Status:** Draft | Ready | In Progress | Completed

---

## Goal
[What needs to be built — specific end state]

## Why
- [Business / product value]
- [Integration with existing navigation & shells]
- [Who benefits]

## What
[User-visible behavior and technical requirements]

### Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]
- [ ] [Measurable outcome 3]

---

## All Needed Context

### Documentation & References
```yaml
# MUST READ — include in context window
- file: AGENTS.md
  why: mobile-first absoluto; branch develop; Apple-quality motion

- file: src/navigation/navConfig.ts
  why: paths, NavItem, matchPaths, BUSINESS_PATHS

- file: src/hooks/useAppNavigation.ts
  why: pushTabRoot, TAB_ROOT_PATHS, go/back/goRoot

- file: src/components/AppShell.tsx
  why: hamburguesa global; BottomNav desactivado
```

### Current Codebase Structure
```bash
src/
├── App.tsx                 # IonReactRouter + IonRouterOutlet routes
├── components/             # AppShell, AppHeader, MobileSideNav, SideNav, BottomNav (off)
├── hooks/                  # useAppNavigation, useModuleNav, useViewport
├── navigation/             # navConfig, breadcrumbs, moduleNavFrom
├── pages/                  # Agilito, hubs, módulos, ops, reports, chats
├── theme/agiliza.css       # design tokens + chrome mobile
└── utils/                  # syncTabVisibility, instantNavAnimation, navFocus
```

### Desired Structure (files to add/modify)
```bash
# List new/changed files with responsibility comments
```

### Known Gotchas & Library Quirks
```ts
// CRITICAL (AGENTS.md): mobile-first; validar touch targets / safe-area antes de cerrar UI
// CRITICAL: integrar en develop; no product changes a master
// CRITICAL: Ionic root+replace deja el hijo (Productos) visible encima del tab
//   → useAppNavigation.pushTabRoot hace goBack + syncTabVisibility
// CRITICAL: fadeNavAnimation custom puede interferir con stack; no quitar sync sin alternativa
// CRITICAL: AppShell NO monta BottomNav; navegación = hamburguesa (MobileSideNav) + SideNav tablet
// CRITICAL: header mobile reserva padding-left 4.5rem para .ag-mobile-menu-trigger
// PATTERN: i18n via react-i18next keys en es.json / en.json
// PATTERN: páginas de marca envueltas con branded() en App.tsx
```

---

## Implementation Blueprint

### Data Models / Types
```ts
// Core types for this feature
```

### Tasks (in execution order)
```yaml
Task 1: [Description]
  - MODIFY: path/to/file.ts
  - PATTERN: Follow existing X
  - PRESERVE: Y

Task 2: ...
```

### Pseudocode (with CRITICAL details)
```ts
// Task N: ...
```

### Integration Points
```yaml
ROUTES:
  - App.tsx IonRouterOutlet — aliases and branded pages
NAV:
  - navConfig / MobileSideNav / useModuleNav
I18N:
  - src/i18n/locales/es.json (+ en.json si aplica)
CSS:
  - src/theme/agiliza.css — mobile-first
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
npm run lint
npx tsc --noEmit
```

### Level 2: Unit Tests
```bash
npm run test.unit -- --run
```

### Level 3: Build & Manual / Playwright
```bash
npm run build
npm run dev
# Mobile viewport ~390x844
# Flujos: login → marca → Agilito → Productos → menú Agilito
#         Pagos → Productos → Volver → Pagos
#         hamburguesa en Reportes/Ops/Chats/Pagos
```

---

## Final Checklist

- [ ] `npm run lint` clean
- [ ] `npx tsc --noEmit` / `npm run build` OK
- [ ] Mobile-first: touch targets, overflow, safe-area
- [ ] Navegación Ionic: sin pantalla fantasma (Productos encima de Agilito)
- [ ] BottomNav sigue desactivado salvo que el PRP diga lo contrario
- [ ] i18n keys en es (y en si se añaden strings)
- [ ] Sin paths hardcodeados duplicados si el registry ya existe

---

## Anti-Patterns to Avoid

- ❌ No reintroducir BottomNav “solo para probar”
- ❌ No duplicar BUSINESS_PATHS / TAB_ROOTS en un cuarto archivo
- ❌ No usar `history.push` para tabs (desincroniza Ionic)
- ❌ No borrar `syncTabVisibility` sin reemplazo estable
- ❌ No layouts desktop-first
- ❌ No commits a `master`

---

## Notes

[Decisions, dependencies between PRPs, out of scope]
