# Epics — Product Requirements Prompts (agiliza360-mobile)

## Epic A: DRY navigation & layouts

Refactor de navegación y chrome para poder añadir features sin duplicar paths ni pelear con el stack de Ionic.

### Orden de ejecución

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 001 | [route-registry](./001--route-registry.md) | Done | Fundación — registry único |
| 002 | [business-modules-catalog](./002--business-modules-catalog.md) | Done | Catálogo hubs |
| 003 | [tab-stack-layouts](./003--tab-stack-layouts.md) | Done | Chrome DRY |
| 004 | [ionic-nav-stable](./004--ionic-nav-stable.md) | Draft | Spike obligatorio |

### Estado actual (contexto Cesar)

- Hamburguesa global; BottomNav desactivado en `AppShell`
- `pushTabRoot` + `syncTabVisibility` mitigan pantallas fantasma
- Módulos de negocio resaltan **Pagos** en nav
- Headers de módulos compactos (back + título)

---

## Epic B: Operaciones restaurante — cola simple

Detalle: [README-ops.md](./README-ops.md)

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 005 | [ops-attention-queue](./005--ops-attention-queue.md) | Completed | Cola por foco; **no renombrar estados** |
| 006 | [ops-order-card-urgency](./006--ops-order-card-urgency.md) | Completed | Badge + urgencia + CTA; depende de 005 |

**Restricciones:** nombres `ops.kanban*` / `ops.subStates.*` inmutables; mobile + tablet; branch `develop`.

---

## Epic C: Conexión a ssgg (API real)

Detalle: [README-ssgg-connection.md](./README-ssgg-connection.md)

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 007 | [ssgg-api-client-auth](./007--ssgg-api-client-auth.md) | Completed | Cliente HTTP + JWT; flag mock |
| 008 | [ssgg-brands-orders](./008--ssgg-brands-orders.md) | Completed | Marcas + órdenes; depende de 007 |
| 009 | [ssgg-orders-events-sockets](./009--ssgg-orders-events-sockets.md) | Completed | Socket.IO /orders + /events |

**Backend hermano:** `ssgg` PRP [200--mobile-admin-cors-origins](../../ssgg/PRPs/200--mobile-admin-cors-origins.md) + [epic](../../ssgg/PRPs/README--mobile-admin-connection-epic.md).

---

## Cómo ejecutar un PRP

En Agent mode: *“Execute PRP 005”* o *“Implementa PRPs/005--ops-attention-queue.md”*.

Seguir la skill `prp-manager` (Workflow 3: Execute) si está disponible.

## Template

Ver [templates/prp_base.md](./templates/prp_base.md) (stack Ionic React + Vite + ESLint + Vitest).
