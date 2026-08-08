# PRP 011 — Operaciones: paridad de datos con panel (Órdenes)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** In Progress (Fase A done)  
> **Depends on:** [007](./007--ssgg-api-client-auth.md), [008](./008--ssgg-brands-orders.md), [009](./009--ssgg-orders-events-sockets.md)  
> **UX previa (ya hecha):** [005](./005--ops-attention-queue.md), [006](./006--ops-order-card-urgency.md)  
> **Branch target:** `develop`  
> **Epic:** [Conexión a ssgg](./README-ssgg-connection.md)  
> **Contraparte panel:** `panel-admin-ag360ai/src/pages/Operaciones` (vista **Órdenes** / kanban + datos de `useOperacionesData`)

---

## Implementation notes (Fase A — 2026-08-08)

- Extraído `utils/orderKanban.ts` (imports fuera de apiMock).
- `ordersQuery.ts`: `dateMode=today|range|last12Hours`, default **hoy calendario**, limit 150.
- `orderService` / `apiFacade` / `AppContext.setOrdersFilters` + `refreshOrders` usan filtros activos (sockets incluidos).
- `OperationsPage`: Aplicar fecha → refetch server; search debounce 400 ms.
- Pendiente Fase B/C: status canónico `/orders/:id/status`, bot global.

---

## Goal

Que **Operaciones** en el móvil use los **mismos contratos de listado/filtro/cambio de estado** que el panel web en Operaciones → **Órdenes**, sin clonar el kanban de 5 columnas ni el embudo.

La UI móvil se mantiene (cola por focos Nuevos / En proceso / Entregado). Este PRP cierra la **capa de datos y filtros** que hoy está a medias: fecha solo en cliente, siempre `last12Hours`, helpers aún en `apiMock`, agente local, etc.

---

## Why

- Con mock off ya hay pedidos reales (008) y refresh por socket (009), pero el date picker de Operaciones **no vuelve a pedir a ssgg** → en rangos distintos de “últimas 12 h” la lista queda vacía o incompleta aunque el panel sí muestre órdenes.
- El panel construye query con `buildOrdersQueryParams` (`dateFrom`/`dateTo` o `last12Hours`, `subdomains`, `search`, `branchId`). El móvil fija `last12Hours=true` y filtra fechas en memoria.
- `getKanbanGroup` / `getKanbanSubState` viven en `apiMock.ts` aunque son lógica de UI pura → acoplamiento confuso.
- El toggle **AGENTE OFF** del header es estado local; en panel es bot global por subdomain (`loadBotState` / `updateBotState`).

---

## Estado actual (baseline)

| Capacidad | Móvil hoy | Panel Operaciones (Órdenes) |
|-----------|-----------|------------------------------|
| Listar órdenes | `GET /orders?subdomains&last12Hours&limit=100` (008) | `buildOrdersQueryParams` + `limit=150` + `search` |
| Cambiar estado | `PUT /order-orchestration/:id/status` `{ newStatus }` | Preferido panel: `PUT /orders/:id/status` (+ resolve id canónico); orquestación también usada en flujos |
| Live | Sockets `/orders`+`/events` → `refreshOrders` (009) | React Query + invalidación por eventos |
| Filtro fecha UI | Cliente sobre `createdAt` | Server: `dateFrom`/`dateTo` o `last12Hours` |
| Búsqueda | Cliente | Server `search` (+ cliente en kanban) |
| UX columnas | 3 focos (005) | Kanban Pre orden / Aceptado / En cocina / … |
| Embudo / Chat / Reservas tabs | No | Sí |
| Bot global | `agentEnabled` localStorage | API bot por subdomain |
| Programados | No | `getScheduledOrders` aparte |
| Cancelación Yango / voucher | No | Diálogos en `useOperacionesData` |

**Conclusión:** no rehacer la UI del panel; alinear **fetch + status + agente** y opcionalmente programados.

---

## What

### User-visible (móvil)

1. Pill **Hoy** / rango de fechas dispara **refetch** a ssgg con los mismos criterios de fecha que el panel (`dateFrom`+`dateTo` para día/rango; preset “hoy” = día calendario; opción operativa default puede seguir siendo últimas 12 h al entrar).
2. Buscar pedido/cliente: opcionalmente enviar `search` al API (debounce ~400 ms como panel); el filtrado local puede quedar como refuerzo.
3. Contadores Nuevos / En proceso / Entregado y la cola reflejan el set cargado del servidor (no un subset truncado por `last12Hours` cuando el usuario pide otro día).
4. Toggle agente: ON/OFF real del bot de la marca (mismo contrato que header Operaciones del panel), con toast si falla o está locked.
5. Mock on: comportamiento demo intacto (sin romper 005/006).

### Technical

#### 1. Ampliar `orderService.getOrders`

Firma orientativa:

```ts
getOrders(brand: Brand, filters?: {
  dateMode: 'today' | 'last12Hours' | 'range';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  search?: string;
  branchId?: string;
  limit?: number; // default 150 (panel)
}): Promise<Order[]>
```

- Query alineada a `panel-admin-ag360ai/src/pages/Orders/utils/ordersQueryMapper.ts` → `buildOrdersQueryParams`.
- Siempre `subdomains = brand.subdomain` (owner móvil).
- **No** inventar endpoints nuevos.

#### 2. Cablear fecha + búsqueda en AppContext / OperationsPage

- Al cambiar `dateStart`/`dateEnd`/`dateMode` en `OperationsPage`, llamar `refreshOrders(filters)` (o `loadOrdersForBrand` con filtros) en lugar de solo filtrar el array en memoria.
- Mientras carga: spinner / skeleton en la cola; no vaciar contadores a 0 sin feedback.
- Sockets (009): al refrescar, respetar los **filtros activos** (no volver a forzar solo `last12Hours` si el usuario está en un rango).

#### 3. Extraer kanban helpers fuera de `apiMock`

- Mover `getKanbanGroup`, `getKanbanSubState`, `getKitchenAction` a p.ej. `src/utils/orderKanban.ts` (reexport desde apiMock si hace falta para no romper imports de golpe).
- Actualizar `OperationsPage`, `OrderCard`, `opsQueue`.

#### 4. Status update — alinear con panel (recomendado)

- Preferir el mismo path que `ordersService.updateStatus` del panel: `PUT /orders/:canonicalId/status` con body tipado, resolviendo `_id` si el móvil solo tiene `orderNumber`.
- Mantener `order-orchestration/.../status` como fallback documentado si ya funciona en prod; **una sola** ruta primaria en código para no divergir.

Referencia: `panel-admin-ag360ai/src/pages/Orders/services/ordersService.ts` (`resolveCanonicalOrderId`, `updateStatus`).

#### 5. Agente (bot global) — corte mínimo

- Servicio delgado: GET/PUT bot state por `subdomain` (mismo que usa `useBotCtx` / Operaciones header en panel).
- `AgentToggle` / `AppContext.toggleAgent` → API real cuando mock off; localStorage solo mock o cache optimista.
- Si `lockedBySuperadmin`: no permitir toggle; toast con copy existente o key nueva `agent.locked`.

#### 6. (Opcional en este PRP) Órdenes programadas

- Si el backend marca `Programado` y el panel las trae con `getScheduledOrders`, decidir:
  - **A)** merge en la cola móvil bajo foco Nuevos / chip dedicado, o
  - **B)** defer a PRP 012.
- Default recomendado: **B** si el tiempo aprieta; dejar nota en Out of scope.

### Success Criteria

- [ ] Mock off + marca Smash: Operaciones muestra las mismas órdenes del día que el panel (Órdenes) para el mismo `dateFrom`/`dateTo` (tolerancia: limit/paginación).
- [ ] Cambiar pill Hoy → otro día: Network muestra nuevo `GET /orders` con fechas; lista actualiza.
- [ ] Rango multi-día: query con `dateFrom`≠`dateTo`.
- [ ] Cambio de estado desde sheet/card persiste y se ve en panel web (o Network 2xx + refetch).
- [ ] Socket de pedido nuevo refresca con filtros actuales.
- [ ] `getKanbanGroup` ya no depende conceptualmente de “mock”.
- [ ] Toggle agente llama API real (o documentado skip si endpoint no accesible al rol).
- [ ] Mock on: demo Operaciones sin regresiones 005/006.
- [ ] lint + tsc + tests kanban/mapper verdes.

### Out of scope (explícito)

- Clonar kanban de 5 columnas / vista AGRUPADO / filtrar columnas del panel.
- Pestañas Embudo, Chat interno Operaciones, Reservas.
- `+ Nueva venta`, print bridge, integraciones Yango (dialogs 409), voucher Pre Orden.
- Notificaciones inbox / chats tab global (PRP posterior).
- Filtro multi-sucursal completo (se puede dejar `branchId` en firma pero UI “todas” por defecto).
- Rediseñar taxonomía focos Nuevos/En proceso/Entregado (005).

---

## All Needed Context

### Documentation & References

```yaml
# Panel — fuente de verdad de contratos
- file: ../panel-admin-ag360ai/src/pages/Operaciones/index.tsx
  why: shell Operaciones; tabs Embudo/Órdenes/Chat/Reservas; bot global

- file: ../panel-admin-ag360ai/src/pages/Operaciones/hooks/useOperacionesData.ts
  why: getOrders params, scheduled, status change, search debounce

- file: ../panel-admin-ag360ai/src/pages/Orders/utils/ordersQueryMapper.ts
  why: buildOrdersQueryParams (hoy / last12Hours / range)

- file: ../panel-admin-ag360ai/src/pages/Orders/services/ordersService.ts
  why: GET /orders, PUT /orders/:id/status, getScheduledOrders

# Móvil — UI y estado ya cableados a medias
- file: src/pages/OperationsPage.tsx
  why: fecha + search + focos; hoy filtra en cliente

- file: src/context/AppContext.tsx
  why: orders, refreshOrders, advanceOrder, agentEnabled

- file: src/services/orderService.ts
  why: query fija last12Hours — ampliar

- file: src/services/mappers/orderStatusMapper.ts
  why: labels API ↔ OrderStatus UI

- file: src/context/OrdersSocketProvider.tsx
  why: refresh debe usar filtros activos

- file: src/services/apiMock.ts
  why: extraer getKanbanGroup / getKanbanSubState

- file: PRPs/008--ssgg-brands-orders.md
  why: baseline listado/status

- file: PRPs/009--ssgg-orders-events-sockets.md
  why: live refresh
```

### Desired Structure

```bash
src/
├── services/
│   ├── orderService.ts          # MODIFY: filtros fecha/search/limit
│   ├── botService.ts            # NEW (opcional): estado bot subdomain
│   └── apiFacade.ts             # MODIFY: getOrders(filters), toggleAgent
├── utils/
│   └── orderKanban.ts           # NEW: getKanbanGroup / SubState / KitchenAction
├── context/
│   ├── AppContext.tsx           # MODIFY: ordersFilters + refresh con filtros
│   └── OrdersSocketProvider.tsx # MODIFY: refresh con filtros actuales
└── pages/
    └── OperationsPage.tsx       # MODIFY: date/search → refetch server
```

### Known Gotchas

```ts
// CRITICAL: “Hoy” del panel usa timezone de marca; móvil puede usar día local del device
//   → documentar; idealmente alinear con brand.timezone si ya está en Brand/API
// CRITICAL: last12Hours ≠ dateFrom=dateTo=hoy; no mezclar ambos en la misma request
// CRITICAL: limit 100 puede ocultar cola real; subir a 150 como panel o paginar
// CRITICAL: no romper labels i18n ops.kanban* / ops.subStates.* (005)
// CRITICAL: status cancelado / programado — mapear o excluir del foco Nuevos con regla clara
// GOTCHA: OperationsPage importa getKanban* desde apiMock — mover antes de más features
// PATTERN: mismo StdApiResponse unwrap que brand/orders (unwrapApiPayload)
```

---

## Implementation Blueprint

### Fase A — Filtros de listado (P0)

1. Extender `orderService` + `apiFacade.getOrders` / `AppContext.refreshOrders(filters)`.
2. `OperationsPage`: onApply date picker → setFilters + reload; quitar dependencia exclusiva del filter client-side (puede quedar como safety net).
3. Actualizar `OrdersSocketProvider` para leer filtros actuales (ref o context).
4. Tests: mapper status intacto; smoke test construcción de query string.

### Fase B — Status canónico (P0/P1)

1. Adoptar `PUT /orders/:id/status` con resolve de id (copiar lógica mínima del panel).
2. Verificar `advanceOrder` / sheet de detalle.

### Fase C — Bot global (P1)

1. `botService` + cablear `AgentToggle`.
2. Toast locked / error.

### Fase D — Programados (P2 / otro PRP)

1. Solo si producto lo pide en la misma entrega.

### Task list (orden)

```text
Task 1: Extraer orderKanban.ts y actualizar imports
Task 2: orderService.getOrders(filters) + tests query
Task 3: AppContext ordersFilters + refreshOrders(filters)
Task 4: OperationsPage date/search → server refetch
Task 5: OrdersSocketProvider respeta filtros
Task 6: Alinear updateStatus con panel (/orders/:id/status)
Task 7: botService + AgentToggle (mock off)
Task 8: Manual QA Smash vs panel mismo día; marcar PRP Completed + epic
```

---

## Validation Gate

```bash
# En panel-admin-ag360ai-movile
npx tsc --noEmit
npx vitest run src/utils/opsQueue.test.ts src/services/mappers/orderStatusMapper.test.ts
npx eslint src/pages/OperationsPage.tsx src/services/orderService.ts src/context/AppContext.tsx

# Manual (mock off, ssgg local)
# 1. Login + marca Smash
# 2. Operaciones Hoy → comparar conteos con panel Órdenes (mismo día)
# 3. Cambiar a ayer → Network dateFrom/dateTo; lista coherente
# 4. Crear pedido de prueba → socket refresca sin resetear filtro de fecha
# 5. Avanzar estado → se refleja en panel
# 6. Toggle agente → estado bot en panel coincide
```

---

## Decisiones de producto (v1)

| Tema | Decisión |
|------|----------|
| UX | Mantener cola 3 focos (005); no clonar kanban web |
| Fuente listado | Mismo `GET /orders` que panel |
| Default al entrar | `dateMode=today` (`dateFrom=dateTo=hoy`) **o** `last12Hours` — elegir uno y documentar en Notes al implementar; recomendación: **hoy calendario** para igualar pill “Hoy” de la UI móvil |
| Embudo | Fuera de alcance |
| Programados | Diferir salvo acuerdo explícito |
| Endpoints nuevos ssgg | No |

---

## Notes / post-implementación

_Rellenar al completar:_

- Default de fecha elegido: …
- Status path final (`/orders/...` vs orchestration): …
- Bot endpoint exacto usado: …
