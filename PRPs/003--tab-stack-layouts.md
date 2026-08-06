# PRP: Layouts TabLayout / StackLayout (chrome DRY)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-06  
> **Status:** Ready  
> **Depends on:** PRP 001 (useModuleNav / parents estables)  
> **Branch target:** `develop`

---

## Goal

Layouts reutilizables para el chrome de páginas autenticadas, eliminando el boilerplate repetido `IonPage` → `IonContent.ag-screen` → `AppShell` → `AppHeader` → body en cada feature page.

## Why

- Products/Marketing/Locations/BrandData/Settings/Notifications repiten el mismo andamiaje.
- Headers compactos (back icon + title + bell) ya existen en `AppHeader`; falta un layout que lo estandarice.
- Reduce fricción al añadir pantallas stack/tab.

## What

### User-visible
- Mismo look actual: stacks con header compacto; tabs (Reportes/Ops/Pagos/…) con `centeredCompact` donde ya aplica.
- Hamburguesa global; **sin** BottomNav.

### Technical
- `TabLayout` y `StackLayout` en `src/components/layouts/`
- Migrar páginas módulo + settings/notifications
- Opcional: search slot en StackLayout (Products/Marketing)

### Success Criteria
- [ ] Al menos Products, Marketing, Locations, BrandData, Settings, Notifications usan StackLayout
- [ ] Reportes y/o PaymentsHub usan TabLayout (o documentar excepción)
- [ ] Cero breadcrumbs/subtítulo en stacks (como el compact actual)
- [ ] lint + build OK; mobile header con padding para hamburguesa

---

## All Needed Context

### Documentation & References
```yaml
- file: src/components/AppHeader.tsx
  why: isSub = onBack → back icon, sin AgentToggle, sin subtitle

- file: src/components/AppShell.tsx
  why: MobileSideNav siempre en mobile; BottomNav comentado

- file: src/hooks/useModuleNav.ts
  why: onBack via back(getModuleNavFrom(...))

- file: src/pages/ProductsPage.tsx
  why: patrón Stack a generalizar (onBack + showAlerts + search)

- file: src/pages/ReportsPage.tsx
  why: patrón Tab centeredCompact

- file: src/theme/agiliza.css
  why: .ag-header padding-left 4.5rem; .ag-header--sub compact
```

### Desired Structure
```bash
src/components/layouts/
├── TabLayout.tsx      # IonPage + Content + AppShell + AppHeader (centeredCompact?)
├── StackLayout.tsx    # + onBack from useModuleNav; optional search/action
└── index.ts
```

### Known Gotchas
```ts
// CRITICAL: no montar BottomNav
// CRITICAL: padding-left header 4.5rem — no quitar al “limpiar” layout
// CRITICAL: Agilito NO usa estos layouts (tiene composer + chrome propio)
// PATTERN: branded() wrap en App.tsx — layouts viven dentro de la page
// GOTCHA: OperationsPage tiene scroll header propio — migrar después o dejar fuera
```

---

## Implementation Blueprint

### Props (sketch)
```tsx
// StackLayout
type StackLayoutProps = {
  title: string;
  showAlerts?: boolean;
  search?: AppHeader['search']; // mirror existing shape
  action?: ...;
  children: React.ReactNode;
  contentClassName?: string; // default ag-screen
  bodyClassName?: string;    // ag-body module-body ...
};

// Inside: const { onBack } = useModuleNav();
// <AppHeader title onBack={onBack} showAlerts search />
```

### Tasks
```yaml
Task 1: CREATE TabLayout + StackLayout
Task 2: Migrar ProductsPage + MarketingPage
Task 3: Migrar LocationsPage + BrandDataPage
Task 4: Migrar SettingsPage + NotificationsPage
Task 5: Migrar PaymentsHubPage y/o ReportsPage a TabLayout
Task 6: Dejar Agilito/Welcome/Login/Ops fuera (documentar)
Task 7: lint/build + smoke headers + Volver
```

### Integration Points
```yaml
CSS:
  - No requerir nuevas clases salvo wrappers mínimos
I18N:
  - titles siguen viniendo de t('...')
```

---

## Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
```

Manual (390px):
- Productos: back + título + search + campana; sin AGENTE OFF en header
- Volver a hub correcto
- Reportes/Pagos: título centrado + hamburguesa

---

## Final Checklist

- [ ] Layouts usados en ≥6 pages stack
- [ ] Comportamiento header compacto preservado
- [ ] Mobile-first / safe-area
- [ ] lint/build OK

---

## Anti-Patterns to Avoid

- ❌ No meter lógica de negocio (fetch productos) en el layout
- ❌ No forzar Agilito dentro de StackLayout
- ❌ No reintroducir breadcrumbs “por si acaso”

---

## Notes

- Confidence: **8/10**
- PRP 004 puede asumir Layouts estables para markers `data-ag-route` en IonPage del layout
