# PRP: Operaciones — tarjeta, urgencia y CTA (sin renombrar estados)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-07  
> **Status:** Completed  
> **Depends on:** PRP 005 (cola por foco)  
> **Branch target:** `develop`  
> **Epic:** Operaciones restaurante (cola simple)

---

## Goal

Hacer la tarjeta de pedido **accionable en un vistazo**: mostrar el **subestado con el nombre i18n actual**, priorizar `needsHuman` / Humano dentro de Nuevos, y una **CTA primaria** según grupo — sin cambiar ningún label de estado.

## Why

- Tras PRP 005 la cola es simple; la card aún muestra poco contexto (cliente + teléfono + 3 botones iguales).
- El restaurante debe ver **Iniciando / Pidiendo / Humano / En cocina / …** (nombres fijos) y saber qué tocar primero.
- `needsHuman` ya existe en el modelo; debe subir en la lista, no renombrarse.

## What

### User-visible

1. Badge o línea de estado en `OrderCard` con `t(\`ops.subStates.${getKanbanSubState(order)}\`)` — **mismo texto** que hoy en secciones.
2. Dentro del foco Nuevos (y al listar): orden estable  
   `human` / `needsHuman` primero → luego `ordering` → `starting` (u orden documentado en Notes).
3. CTA primaria contextual (misma card):
   - Nuevos + human → enfatizar **Chat** (o el botón ya existente `orders.openChat`) como primaria visual.
   - En proceso → enfatizar **Estado** (`orders.openStatus`) como primaria.
   - Entregado → Estado secundaria / Chat secundaria; sin inventar labels nuevos de estado.
4. Botones secundarios siguen: Chat, Llamar, Estado (keys `orders.*` existentes).
5. Feedback press 150–250ms; sin animaciones ornamentales en cada card al scrollear (Emil: lista de alta frecuencia → motion mínima).
6. Mobile y tablet: misma card; tablet puede mostrar un poco más de padding, no otra jerarquía de botones.

### Technical

- `OrderCard.tsx`: badge subestado; clase `--primary` en un botón según `getKanbanGroup` + `needsHuman`.
- Opcional helper `sortOpsQueue(orders: Order[]): Order[]` junto a `getKanbanSubState` (mismo archivo o `src/utils/opsQueue.ts`).
- **PROHIBIDO** alterar strings de `ops.subStates.*` / `ops.kanban*`.
- No cambiar semántica de `updateOrderStatus` salvo wiring de CTA que ya abra sheet.

### Success Criteria

- [x] Cada card muestra subestado con label i18n existente
- [x] En Nuevos, items `human` / `needsHuman` aparecen antes que el resto
- [x] Una CTA se ve claramente primaria; las otras siguen disponibles
- [x] Ningún rename de estados
- [x] Mobile + tablet: targets ≥44px; sin overflow
- [x] lint + build OK

---

## Implementation notes (Completed 2026-08-07)

- `src/utils/opsQueue.ts` + test: sort human → ordering → starting → cocina…
- `OrderCard`: badge `ops.subStates.*`; Chat primaria si Humano; Estado primaria en resto (no primary en Entregado)
- `OperationsPage`: `sortOpsQueue` antes del slice; sin stagger animado
- CSS: `.order-card__state-badge`, `.order-card-actions .is-primary`; touch 44px

## All Needed Context

### Documentation & References

```yaml
- file: PRPs/005--ops-attention-queue.md
  why: cola por foco; este PRP asume activeFocus ya existe

- file: src/components/OrderCard.tsx
  why: markup actual de acciones

- file: src/services/apiMock.ts
  why: getKanbanSubState, getKanbanGroup, needsHuman en datos mock

- file: src/i18n/locales/es.json
  why: ops.subStates.*, orders.openStatus / openChat / call — no renombrar estados

- file: src/components/OrderDetailSheet.tsx
  why: destino de CTA Estado
```

### Desired Structure

```bash
src/components/OrderCard.tsx
  # badge subestado + primary action class

src/utils/opsQueue.ts   # optional
  # sortOpsQueue(orders)

src/pages/OperationsPage.tsx
  # apply sortOpsQueue before render visible list

src/theme/agiliza.css
  # .order-card__state-badge, .order-card-actions .is-primary
```

### Known Gotchas

```ts
// CRITICAL: Badge text = t(`ops.subStates.${sub}`) ONLY — no synonym copy
// CRITICAL: Do not replace "Humano" with "Atención" or similar
// PATTERN: leadTag (new/recurring/vip) already on card — keep; don't collide styles with state badge
// PATTERN: tel: links need min 44px hit area on mobile
```

---

## Implementation Blueprint

### Data Models

```ts
// sort key only — display still uses KanbanSubState i18n
function urgencyRank(order: Order): number {
  if (order.needsHuman || getKanbanSubState(order) === 'human') return 0;
  const sub = getKanbanSubState(order);
  if (sub === 'ordering') return 1;
  if (sub === 'starting') return 2;
  if (sub === 'in_kitchen') return 3;
  if (sub === 'ready') return 4;
  if (sub === 'on_the_way') return 5;
  return 6; // delivered etc.
}
```

### Tasks

```yaml
Task 1: Helper sortOpsQueue (+ unit test si el proyecto ya testea utils)
Task 2: OrderCard — badge con ops.subStates.*; estilos mobile-first
Task 3: OrderCard — marcar CTA primaria según group / needsHuman
Task 4: OperationsPage — sort lista del foco antes de slice/paginación
Task 5: CSS tablet: spacing de badge/acciones sin cambiar jerarquía
Task 6: Validar en 390 y 768; lint/build
```

### Pseudocode

```tsx
const sub = getKanbanSubState(order);
const group = getKanbanGroup(order.status);
const primary: 'chat' | 'status' =
  order.needsHuman || sub === 'human' ? 'chat' : 'status';

<span className="order-card__state-badge">{t(`ops.subStates.${sub}`)}</span>

<button className={primary === 'status' ? 'is-primary' : ''} onClick={onClick}>
  … {t('orders.openStatus')}
</button>
<button className={primary === 'chat' ? 'is-primary' : ''} onClick={onChat}>
  … {t('orders.openChat')}
</button>
```

### Integration Points

```yaml
I18N: solo keys existentes para estados y acciones de card
CSS: agiliza.css
PAGE: OperationsPage consume sort + OrderCard
```

---

## Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run dev
# Nuevos: Humano primero; badge dice "Humano" / "Iniciando" / "Pidiendo"
# En proceso: badge En cocina / Listo / En camino
# Primary CTA visible; Chat/Llamar/Estado siguen
```

---

## Final Checklist

- [ ] Subestado visible con nombre oficial
- [ ] Urgencia human primero
- [ ] CTA primaria clara
- [ ] Sin renames i18n de estados
- [ ] Mobile + tablet OK
- [ ] develop

---

## Anti-Patterns to Avoid

- ❌ Synonyms de marketing en el badge
- ❌ Ocultar Chat/Llamar
- ❌ Animar cada card al entrar en viewport (lista de alta frecuencia)
- ❌ Duplicar lógica de sort en tres sitios

---

## Notes

- Si el sheet de detalle ya cambia estado, la CTA Estado solo abre sheet (no inventar segundo flujo).
- Kitchen mode (`KitchenPage`) fuera de alcance salvo que comparta OrderCard y se rompa visualmente — entonces ajustar estilos scoped.
