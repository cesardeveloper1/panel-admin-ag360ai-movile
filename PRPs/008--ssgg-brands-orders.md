# PRP: Marcas y órdenes reales desde ssgg

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** Completed  
> **Depends on:** [007--ssgg-api-client-auth](./007--ssgg-api-client-auth.md)  
> **Branch target:** `develop`  
> **Epic:** [Conexión a ssgg](./README-ssgg-connection.md)  
> **Backend:** sin endpoints nuevos; contratos existentes del panel web  
> **Hermano CORS:** `ssgg/PRPs/200--mobile-admin-cors-origins.md`

---

## Implementation notes (Completed 2026-08-08)

- `brandService` / `orderService` + mappers (`brandMapper`, `orderMapper`, `orderStatusMapper`).
- `apiFacade.getBrands|getOrders|updateOrderStatus` con flag mock.
- Welcome / RequireBrand / AppContext cableados; createBrand real → comingSoon.
- Query: `subdomains` + `last12Hours=true` + `limit=100`.
- Status API ↔ UI documentado en `orderStatusMapper.ts` + test unitario.

---

## Goal

Sustituir `apiMock.getBrands`, `getOrders` y `updateOrderStatus` por llamadas reales a `ssgg`, con **mappers** desde el modelo Mongo/API al modelo UI del móvil (`Brand`, `Order`, `OrderStatus`), de modo que Welcome → selección de marca → Operaciones / Cocina muestren datos reales.

Mantener mock detrás de `VITE_USE_API_MOCK=true`.

---

## Why

- Operaciones (PRPs 005/006) ya asumen cola/focos sobre `Order`; sin datos reales el móvil no es usable en restaurante.
- El panel web ya consume `GET /orders`, `PUT /order-orchestration/:id/status`, `GET /brand/...`.
- Los IDs/statuses del mock (`pacifico`, `in_kitchen`) no coinciden 1:1 con el backend → hace falta capa de mapeo, no “fetch y render”.

---

## What

### User-visible

1. Tras login real, Welcome lista marcas del usuario (no seed `pacifico`/`anticuchos`).
2. Al elegir marca, Operaciones/Cocina cargan órdenes reales (filtros por marca/subdomain según contrato JWT).
3. Avanzar estado de una orden (`advanceOrder`) persiste vía orquestación y refresca la tarjeta.
4. Errores de red/API → toast; no dejar UI a medias sin feedback.

### Technical

| Facade móvil | API ssgg (vía panel) |
|--------------|----------------------|
| `getBrands` | `GET /brand/all` o `/brand/filter` (mismo que `brandService`) |
| `getOrders(brandId)` | `GET /orders?…` con subdomain / brand según JWT y filtros del panel |
| `updateOrderStatus` | `PUT /order-orchestration/:id/status` body `{ newStatus }` |

1. **`src/services/brandService.ts`**, **`orderService.ts`** (delgados) + **`mappers/`** (`mapBrand`, `mapOrder`, `mapStatusToApi` / `mapStatusFromApi`).
2. Tabla de estados: documentar en el PRP o en comentario del mapper el mapeo `OrderStatus` UI ↔ status backend (aceptado, cocina, listo, en camino, entregado, etc.). Si un status backend no tiene UI, degradar a grupo kanban seguro o ocultar con log.
3. **`apiFacade` / AppContext**: `loadOrdersForBrand`, `selectBrandAndLoad`, `advanceOrder` usan real cuando mock off.
4. **RequireBrand / WelcomePage**: `getBrands` real.
5. No implementar aún: chats, products, notifications, createBrand, sockets (dejar mock o empty state).

### Success Criteria

- [x] Mock off + JWT: Welcome muestra ≥1 marca real del usuario de prueba
- [x] Selección de marca carga órdenes; lista Operaciones no vacía si hay pedidos en ssgg
- [x] `advanceOrder` cambia status en backend y en UI (verificar en panel web o Network)
- [x] Mappers tipados; sin `any` libres en la frontera UI
- [x] Mock on: seeds y flujos demo intactos
- [x] Labels i18n `ops.kanban*` / `ops.subStates.*` **sin renombrar** (005/006)
- [x] lint + tsc/build OK
- [x] Documentado en comentario o README-ssgg qué query params usa `getOrders`

### Out of scope

- Socket.IO live updates (009+)
- Chats / notificaciones / productos / brand config
- Cambiar taxonomía de cola Operaciones
- Endpoints nuevos en ssgg

---

## All Needed Context

### Documentation & References

```yaml
- file: src/services/apiMock.ts
  why: getBrands, getOrders, updateOrderStatus, getKanbanGroup/SubState

- file: src/context/AppContext.tsx
  why: loadOrdersForBrand, selectBrandAndLoad, advanceOrder

- file: src/pages/WelcomePage.tsx
  why: lista marcas

- file: src/pages/OperationsPage.tsx
  why: cola; depende de Order tipado

- file: src/utils/opsQueue.ts
  why: focos; no romper semántica

- file: src/types/index.ts
  why: Brand, Order, OrderStatus

- file: ../panel-admin-ag360ai/src/services/brandService.ts
  why: GET /brand/all, create, etc.

- file: ../panel-admin-ag360ai/src/services/orderService.ts
  why: GET /orders, PUT /order-orchestration/:id/status

- file: ../panel-admin-ag360ai/src/pages/Orders/types/orders.types.ts
  why: shape respuesta órdenes

- file: ../ssgg/src/websocket/WEBSOCKET_FRONTEND_GUIDE.md
  why: futuro 009; no implementar aquí

- file: PRPs/005--ops-attention-queue.md
  why: no renombrar estados i18n
```

### Current → Desired

```bash
# Actual
AppContext → apiMock.getOrders / getBrands / updateOrderStatus

# Deseado
AppContext → apiFacade
  → mock | brandService + orderService + mappers
```

### Known Gotchas

```ts
// CRITICAL: getOrdersByBrandId del panel está deprecado; usar GET /orders con filtros
// CRITICAL: update va a /order-orchestration/:id/status no a un PATCH inventado
// CRITICAL: order id vs orderNumber — el panel a veces pasa ambos
// CRITICAL: brand.id en UI hoy es slug mock; real será _id — Welcome/BRAND_KEY deben usar id estable
// GOTCHA: subdomain hace falta para chats luego; conviene guardar subdomain en Brand UI
// PRESERVE: getKanbanGroup / getKanbanSubState semántica sobre OrderStatus UI
```

---

## Implementation Blueprint

### Tasks

```yaml
Task 1: Inspeccionar shape real
  - Leer orderService + types del panel; anotar campos mínimos para OrderCard
  - Definir tabla OrderStatus UI ↔ API

Task 2: Services + mappers
  - ADD: brandService, orderService, mappers/brandMapper.ts, orderMapper.ts
  - Usar api.ts de 007 + unwrap envelope

Task 3: Facade
  - getBrands / getOrders / updateOrderStatus → real o mock

Task 4: AppContext + Welcome
  - Cablear selectBrandAndLoad / refreshOrders / advanceOrder
  - Persist BRAND_KEY con id real

Task 5: QA cruzada
  - Misma marca en panel web y móvil; avanzar status; verificar consistencia
```

### Pseudocode

```ts
async function getOrdersForBrand(brand: Brand): Promise<Order[]> {
  const query = new URLSearchParams({
    // alinear con panel Operaciones (subdomains / brandId / limit)
    subdomains: brand.subdomain,
    limit: '50',
  });
  const res = await api.get(`/orders?${query}`);
  const rows = unwrapList(res);
  return rows.map(mapOrderFromApi);
}

async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const newStatus = mapStatusToApi(status);
  await api.put(`/order-orchestration/${orderId}/status`, { newStatus });
  // refetch or patch local
}
```

### Integration Points

```yaml
API: /brand/*, /orders, /order-orchestration/:id/status
UI: WelcomePage, OperationsPage, KitchenPage, OrderCard, AppContext
I18N: sin renombrar ops.kanban* / ops.subStates.*
FLAG: VITE_USE_API_MOCK
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
# Añadir tests de mapper status (tabla crítica)
```

### Level 3 — Manual

```bash
# ssgg + móvil mock off
# 1) Login → Welcome marcas reales
# 2) Ops: ver pedidos; avanzar uno
# 3) Confirmar en panel-admin-ag360ai el nuevo status
# 4) Mock on: demo seeds OK
```

---

## Final Checklist

- [x] Mappers + tabla de status documentada
- [x] Brands/orders reales con mock off
- [x] advanceOrder end-to-end
- [x] Cola 005/006 sin regresiones de labels
- [x] Epic README actualizado (008 → Ready/Completed cuando aplique)

---

## Anti-Patterns to Avoid

- ❌ Usar IDs mock (`pacifico`) contra Mongo
- ❌ Renombrar keys i18n de estados
- ❌ Implementar sockets “de paso” en este PRP
- ❌ Duplicar lógica de orquestación en el cliente
- ❌ Romper `VITE_USE_API_MOCK` para demos
