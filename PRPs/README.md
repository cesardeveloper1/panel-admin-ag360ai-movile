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
| 010 | [ssgg-reports-dashboard](./010--ssgg-reports-dashboard.md) | Completed | Reportes ← Dashboard OrderFood |
| 011 | [ssgg-operaciones-orders-parity](./011--ssgg-operaciones-orders-parity.md) | Completed | Filtros + status + bot vs panel |

**Backend hermano:** `ssgg` PRP [200--mobile-admin-cors-origins](../../ssgg/PRPs/200--mobile-admin-cors-origins.md) + [epic](../../ssgg/PRPs/README--mobile-admin-connection-epic.md).

---

## Epic D: Captura Android y conciliación de pagos

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 018 | [tradingtracker-payment-capture-and-reconciliation](./018--tradingtracker-payment-capture-and-reconciliation.md) | In progress | Epic Android; captura/entrega/configuración listas, E2E físico pendiente |
| 019 | [android-notification-capture](./019--android-notification-capture.md) | Implemented | Yape, toggle persistente y logs sanitizados; Plin no soportado aún |
| 020 | [tradingtracker-device-delivery](./020--tradingtracker-device-delivery.md) | Implemented | Pairing, cola, WorkManager, ACK y observabilidad local |
| 021 | [payment-reconciliation-operations](./021--payment-reconciliation-operations.md) | Draft | Resultados financieros y revisión desde SSGG |

**Restricción:** Android/Capacitor exclusivamente. Los logs locales describen captura/transporte; nunca equivalen a pago confirmado.

---

## Cómo ejecutar un PRP

En Agent mode: *“Execute PRP 005”* o *“Implementa PRPs/005--ops-attention-queue.md”*.

Seguir la skill `prp-manager` (Workflow 3: Execute) si está disponible.

---

## Epic E: Impresión automática nativa

| # | PRP | Status | Notas |
|---|-----|--------|-------|
| 022 | [native-mobile-auto-print](./022--native-mobile-auto-print.md) | Implemented P0 | Android TCP/Bluetooth listo; QA físico e iOS P1 pendientes |

**Backend:** [`ssgg/PRPs/203--durable-mobile-print-jobs.md`](../../ssgg/PRPs/203--durable-mobile-print-jobs.md)
**Contrato:** [`print-bridge/PRPs/011--portable-thermal-ticket-contract.md`](../../print-bridge/PRPs/011--portable-thermal-ticket-contract.md)

**Restricción:** el APK usa plugin nativo y cola durable; nunca se conecta al loopback de `print-bridge`. La versión web no imprime.

## Template

Ver [templates/prp_base.md](./templates/prp_base.md) (stack Ionic React + Vite + ESLint + Vitest).
