# PRP: Catálogo businessModules (Agilito / Pagos / Business)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-06  
> **Status:** Done  
> **Depends on:** PRP 001 (recomendado; puede hacerse en paralelo si se exporta BUSINESS_PATHS estable)  
> **Branch target:** `develop`

---

## Goal

Un catálogo único de los 4 módulos de negocio (productos, clientes/locales marketing, locales, datos de marca) consumido por `AgilitoPage`, `PaymentsHubPage` y `BusinessHubPage`, sin arrays `modules` duplicados.

## Why

- Los mismos paths e iconos están copiados en 3 pages.
- Cada cambio de ruta/icono se olvida en un hub y rompe consistencia.
- Acelera nuevas “cards” de negocio (una entrada → tres superficies).

## What

### User-visible
- Mismas 4 cards en Agilito (grid vacío), Pagos (hub) y Business (si se mantiene).
- Copy i18n puede seguir distinto por superficie (`agilito.*` / `payments.*` / `business.*`).

### Technical
- `src/navigation/businessModules.ts` (o `src/domain/businessModules.ts`)
- Opcional: componente `HubGrid` / `BusinessModuleCards` reutilizable
- Al navegar: `setModuleNavFrom(AGILITO_PATH | PAYMENTS_PATH)` como hoy

### Success Criteria
- [x] Un solo array define path + icon (+ id) de los 4 módulos
- [x] Agilito / Pagos / Business no definen su propio `modules` con paths
- [x] Volver desde Productos respeta origen (moduleNavFrom)
- [x] lint + build OK

---

## All Needed Context

### Documentation & References
```yaml
- file: src/pages/AgilitoPage.tsx
  why: const modules = [{ path, icon, labelKey }] — patrón a reemplazar

- file: src/pages/PaymentsHubPage.tsx
  why: modules con titleKey/descKey/tone + setModuleNavFrom(PAYMENTS_PATH)

- file: src/pages/BusinessHubPage.tsx
  why: casi clon de PaymentsHub; usa history.push (migrar a go() + setModuleNavFrom)

- file: src/navigation/moduleNavFrom.ts
  why: setModuleNavFrom / getModuleNavFrom

- file: src/navigation/navConfig.ts
  why: BUSINESS_PATHS debe alinearse con el catálogo (paths canónicos)

- file: src/hooks/useModuleNav.ts
  why: back() usa getModuleNavFrom(parent)
```

### Desired Structure
```bash
src/navigation/businessModules.ts
  # BUSINESS_MODULES: { id, path, icon, aliases? }[]
  # helper businessCanonicalPaths()

src/components/BusinessModuleGrid.tsx   # optional
  # props: getTitle(mod), getDesc?(mod), onSelect(mod), tone?(mod)

# Pages only map i18n keys:
#   titleKey: `agilito.${id}Title` | payments.* | business.*
```

### Known Gotchas
```ts
// CRITICAL: setModuleNavFrom ANTES de go(path) — si no, Volver va al parent default (Pagos)
// CRITICAL: BusinessHubPage usa history.push — desync Ionic; usar go() de useAppNavigation
// CRITICAL: aliases /productos etc. viven en registry (001); catálogo usa paths canónicos
// PATTERN: tone 'pulse'|'hot'|'done'|'ink' solo en hubs con hub-card--*
```

---

## Implementation Blueprint

### Data Models
```ts
import type { string as IconString } from 'ionicons'; // use string icon refs like today

export type BusinessModuleId = 'products' | 'clients' | 'locations' | 'brand';

export interface BusinessModule {
  id: BusinessModuleId;
  path: string; // canonical: /app/products, /app/clients, ...
  icon: string; // ionicons outline
}
```

### Tasks
```yaml
Task 1: CREATE businessModules.ts con los 4 módulos e iconos actuales
Task 2: MODIFY AgilitoPage — map BUSINESS_MODULES + labelKey por id; setModuleNavFrom(AGILITO_PATH)
Task 3: MODIFY PaymentsHubPage — map + i18n payments.*; setModuleNavFrom(PAYMENTS_PATH)
Task 4: MODIFY BusinessHubPage — mismo catálogo; history.push → go(); setModuleNavFrom
Task 5: Alinear BUSINESS_PATHS / registry con paths del catálogo (+ aliases existentes)
Task 6: (Opcional) Extraer BusinessModuleGrid / HubCards para DRY de markup hub-card
Task 7: lint/build + smoke hubs
```

### Pseudocode
```tsx
// Agilito
{BUSINESS_MODULES.map((mod) => (
  <button key={mod.id} onClick={() => {
    setModuleNavFrom(AGILITO_PATH);
    go(mod.path);
  }}>
    <IonIcon icon={mod.icon} />
    <span>{t(`agilito.${mod.id}Title` /* o mapa labelKey existente */)}</span>
  </button>
))}
```

Nota: si las keys i18n actuales no siguen el patrón `agilito.productsTitle`, usar un mapa `id → labelKey` en el page o en el catálogo como `i18n: { agilitoLabelKey, paymentsTitleKey, ... }` sin duplicar `path`/`icon`.

### Integration Points
```yaml
I18N:
  - Reutilizar keys existentes (agilito.menuTitle, payments.menuTitle, …)
  - No renombrar keys en este PRP salvo necesidad
NAV:
  - moduleNavFrom + go()
```

---

## Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Manual:
1. Agilito → cada card → ruta correcta → Volver → Agilito  
2. Pagos → cada card → Volver → Pagos  
3. Iconos iguales en Agilito y Pagos  

---

## Final Checklist

- [x] Un catálogo, tres consumidores
- [x] setModuleNavFrom en todos los entry points
- [x] BusinessHub usa go(), no history.push suelto
- [x] lint/build OK
- [x] Mobile-first en grids (1 col mobile si aplica)

---

## Anti-Patterns to Avoid

- ❌ No dejar un `modules` local “por si acaso”
- ❌ No mezclar i18n de tres namespaces en un solo string hardcodeado
- ❌ No navegar con `history.push` en hubs

---

## Notes

- Confidence: **9/10**
- Si PRP 001 no está, exportar paths del catálogo hacia `BUSINESS_PATHS` manualmente
- Out of scope: cambiar copy de Pagos (hoy habla de menú/marketing — producto aparte)
