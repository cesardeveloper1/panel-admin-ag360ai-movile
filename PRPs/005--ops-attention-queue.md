# PRP: Operaciones — cola de atención (restaurante)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-07  
> **Status:** Completed  
> **Depends on:** ninguno (navegación actual basta)  
> **Branch target:** `develop`  
> **Epic:** Operaciones restaurante (cola simple)

---

## Goal

Reemplazar el modo dual **Pedidos / Todos** y el scroll de tres bloques con sub-secciones anidadas por una **cola única filtrada por foco**, usando los **mismos nombres de estado** que ya existen (`ops.kanban*` y `ops.subStates.*`). Optimizado para **celular y tablet**.

## Why

- El restaurante necesita “¿qué hago ahora?”, no navegar el embudo interno del agente.
- Hoy hay dos taxonomías en paralelo (Pedidos vs Todos) y subestados (Iniciando / Pidiendo / Humano) como estructura de página → fricción y carga cognitiva.
- Celular y tablet son el target primario (AGENTS.md mobile-first).

## What

### User-visible

1. **Sin** switch Pedidos / Todos como eje principal de la pantalla.
2. Controles sticky: **fecha** + **buscador** + **3 focos tappable** con labels **exactos** existentes:
   - `ops.kanbanNew` → Nuevos  
   - `ops.kanbanProcessing` → En proceso  
   - `ops.kanbanDelivered` → Entregado  
3. Una sola lista de tarjetas del foco activo (no tres secciones largas una bajo otra).
4. Dentro del foco **Nuevos**, agrupar o filtrar por subestado **sin renombrar**:
   - Chips o headers de grupo: `ops.subStates.starting` / `ordering` / `human` (Iniciando, Pidiendo, Humano).
   - Default: mostrar todos los de Nuevos; chip “todos los Nuevos” puede reutilizar `ops.allView` (“Todos”) **solo como filtro interno del foco**, no como modo de página rival.
5. Foco **En proceso**: subestados `in_kitchen` / `ready` / `on_the_way` con los mismos labels i18n.
6. Foco **Entregado**: lista plana (como hoy).
7. Barra de proporción (púrpura / naranja / verde) puede permanecer como resumen visual; al tocar un segmento = cambia el foco (mismo comportamiento que las cards de resumen).
8. **Mobile:** chips/focos en fila (scroll horizontal si hace falta), lista full-width, touch ≥44px.
9. **Tablet (≥768px):** mismos focos y nombres; layout más aireado (padding / max-width o grilla 2 cols de cards si cabe sin apretar); no inventar una segunda taxonomía.

### Technical

- Refactor de `OperationsPage.tsx`: estado `activeFocus: 'new' | 'processing' | 'delivered'` filtra la lista; eliminar (o dejar detrás de flag) `viewMode` orders/all como UX principal.
- Reutilizar `getKanbanGroup` / `getKanbanSubState` de `apiMock.ts`.
- CSS en `agiliza.css`: clases nuevas bajo prefijo `ops-` / `ops-queue-`; mobile-first + `@media (min-width: 768px)`.
- **PROHIBIDO** cambiar valores de keys existentes en `ops.subStates.*`, `ops.kanban*`, `ops.ordersView`, `ops.allView` (salvo bugs ortográficos ya corregidos como allView→Todos). Si hace falta copy nuevo de UI (ej. aria de cola), **añadir** keys nuevas (`ops.queueAria`, etc.), no sobrescribir nombres de estado.

### Success Criteria

- [x] Un solo listado visible a la vez según foco Nuevos / En proceso / Entregado
- [x] Labels de estado en UI = mismos strings i18n actuales (sin renombres)
- [x] No hay tablist Pedidos/Todos como modo de página (o queda solo en modo avanzado documentado y off por default)
- [x] Celular ~390px: sin overflow horizontal; sticky controls usables; targets ≥44px
- [x] Tablet ≥768px: misma lógica; spacing/layout tablet; SideNav no rompe la cola
- [x] Fecha + búsqueda siguen filtrando el conjunto antes del foco
- [x] lint + `tsc` / build OK

---

## Implementation notes (Completed 2026-08-07)

- `OperationsPage.tsx`: `activeFocus` + `subFilter`; eliminados `viewMode`, IntersectionObserver y triple sección.
- Chips subestado con `ops.allView` + `ops.subStates.*` (nombres intactos).
- i18n auxiliares: `focusAria`, `queueAria`, `queueEmpty`, `collapseThree` (es/en).
- CSS: `.ops-subfilter`, `.ops-queue`, segmentos de proporción clickeables; tablet 2-col cards.

## All Needed Context

### Documentation & References

```yaml
- file: AGENTS.md
  why: mobile-first absoluto; develop; Apple-quality interaction

- file: src/pages/OperationsPage.tsx
  why: UI actual Pedidos/Todos, summary cards, sub-sections, date/search

- file: src/services/apiMock.ts
  why: getKanbanGroup, getKanbanSubState — no cambiar semántica de mapeo sin necesidad

- file: src/types/index.ts
  why: OrderStatus, KanbanGroup, KanbanSubState

- file: src/components/OrderCard.tsx
  why: tarjeta actual; badge de subestado puede añadirse en PRP 006

- file: src/i18n/locales/es.json
  why: ops.* — NO renombrar kanban* ni subStates.*

- file: src/theme/agiliza.css
  why: .ops-*, .kanban-*, sticky controls; tablet media queries

- file: src/hooks/useViewport.ts
  why: isTablet para scroll shell vs IonContent
```

### Current Codebase Structure

```bash
src/pages/OperationsPage.tsx     # dual viewMode + 3 scroll sections
src/components/OrderCard.tsx
src/components/KanbanBoard.tsx
src/services/apiMock.ts          # group/subState helpers
src/theme/agiliza.css            # ops / kanban styles
```

### Desired Structure

```bash
src/pages/OperationsPage.tsx
  # activeFocus + filtered list; optional subFocus chip
  # remove primary Pedidos/Todos tablist

src/theme/agiliza.css
  # .ops-focus-bar, .ops-queue, .ops-queue-group
  # mobile-first; tablet enhancements only in min-width 768px

# NO new i18n keys for state NAMES
# OK: ops.queueEmpty, ops.focusAria (aria/helpers only)
```

### Known Gotchas & Library Quirks

```ts
// CRITICAL: Nombres de estado INMUTABLES — no cambiar es.json ops.kanban* / ops.subStates.*
// CRITICAL: mobile-first; tablet solo enriquece spacing/grid, no otra IA de información
// CRITICAL: AppShell tablet — scroll en .ag-app-shell-main; no romper listeners actuales
// CRITICAL: IntersectionObserver de secciones deja de aplicar si hay una sola lista; limpiar o adaptar
// PATTERN: getKanbanGroup(status) === 'new'|'processing'|'delivered'|null
// PATTERN: getKanbanSubState(order) para chips/headers dentro del foco
// PATTERN: needsHuman → subState 'human' (priorización visual puede ir en PRP 006)
```

---

## Implementation Blueprint

### Data Models / Types

```ts
// Reuse existing — do not invent new status labels
type OpsFocus = KanbanGroup; // 'new' | 'processing' | 'delivered'

// Optional secondary filter inside focus (keys must map to existing i18n)
type OpsSubFilter = 'all' | KanbanSubState;
```

### Tasks (in execution order)

```yaml
Task 1: Inventario i18n
  - VERIFY: ops.kanbanNew / Processing / Delivered y ops.subStates.* quedan intactos
  - ADD only helper keys if needed (aria), never rename state labels

Task 2: Refactor estado de página
  - MODIFY: OperationsPage.tsx
  - REPLACE: viewMode orders|all como eje → activeFocus
  - PRESERVE: date picker, search, OrderDetailSheet, openOrderChat

Task 3: Lista única
  - FILTER: orders by date/query then by getKanbanGroup === activeFocus
  - WITHIN new/processing: group by getKanbanSubState OR chips that filter
  - USE: existing t(`ops.subStates.${sub}`) / t('ops.kanban*')

Task 4: Summary + proportion
  - KEEP: 3 summary cards with same labels
  - WIRE: click → setActiveFocus (no scrollIntoView a secciones fantasma)
  - KEEP: proportion bar colors; click segment → same focus

Task 5: CSS mobile-first + tablet
  - MODIFY: agiliza.css
  - Mobile: focus chips, queue list, sticky controls
  - Tablet: padding, optional 2-col card grid, touch targets intact

Task 6: Cleanup
  - REMOVE dead IntersectionObserver / triple section refs if unused
  - REMOVE or hide ops-view-switch Pedidos/Todos (default off)

Task 7: Validate lint/build + manual mobile 390 + tablet 768/1024
```

### Pseudocode

```tsx
const [activeFocus, setActiveFocus] = useState<OpsFocus>('new');
const [subFilter, setSubFilter] = useState<OpsSubFilter>('all');

const inFocus = useMemo(() => {
  return filtered.filter((o) => getKanbanGroup(o.status) === activeFocus);
}, [filtered, activeFocus]);

const visible = useMemo(() => {
  if (subFilter === 'all') return inFocus;
  return inFocus.filter((o) => getKanbanSubState(o) === subFilter);
}, [inFocus, subFilter]);

// Chips de subestado: solo las keys del foco actual
const subChips = activeFocus === 'new'
  ? NEW_SUBSTATES
  : activeFocus === 'processing'
    ? PROCESSING_SUBSTATES
    : [];

// UI labels — NEVER hardcode Spanish alternatives
t('ops.kanbanNew') // Nuevos
t(`ops.subStates.${sub}`) // Iniciando | Pidiendo | Humano | ...
```

### Integration Points

```yaml
ROUTES:
  - sin cambio de path /app/operations (o el canónico actual)
NAV:
  - SideNav / MobileSideNav sin cambio
I18N:
  - solo keys nuevas auxiliares; estados = existentes
CSS:
  - agiliza.css mobile-first + tablet
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
# Si hay tests de getKanbanGroup / subState, deben seguir verdes
```

### Level 3: Build & Manual

```bash
npm run build
npm run dev
# Mobile ~390x844:
#   - solo un foco activo; labels Nuevos/En proceso/Entregado
#   - en Nuevos, subchips Iniciando/Pidiendo/Humano (nombres exactos)
#   - sin Pedidos/Todos como modo de página
# Tablet ~768 / 1024:
#   - misma IA; más aire; SideNav compact/expand no tapa CTAs
# Date + search filtran antes del foco
```

---

## Final Checklist

- [ ] lint / tsc / build OK
- [ ] Mobile-first + tablet validados
- [ ] **Ningún rename** de `ops.kanban*` ni `ops.subStates.*`
- [ ] Cola única por foco
- [ ] Sin pantallas fantasma Ionic al abrir detalle/chat
- [ ] Branch `develop`

---

## Anti-Patterns to Avoid

- ❌ Renombrar estados a “Atención”, “Por preparar”, etc.
- ❌ Mantener Pedidos/Todos **y** focos (doble modelo)
- ❌ Tres columnas scroll largas + subtítulos anidados como layout default
- ❌ Layout solo tablet y “ya se verá” en mobile
- ❌ Hardcodear strings de estado en JSX
- ❌ Commits a `master`

---

## Notes

- Priorización `needsHuman` al tope + CTA primaria en card → **PRP 006**.
- Modo embudo avanzado (ex-Todos) para soporte/superadmin queda **out of scope** salvo flag documentado off.
- Skills de diseño (impeccable / ui-ux-pro-max / emil): product register; motion 150–250ms; sin decorative load choreography.
