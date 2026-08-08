# Epic C — Conexión a ssgg (API real)

> **Project:** agiliza360-mobile (`panel-admin-ag360ai-movile`)  
> **Backend:** `ssgg`  
> **Estado:** In Progress (007–009 + ssgg 200 Completed; chats pendientes)  
> **Branch target:** `develop`

## Objetivo

Reemplazar `apiMock` por el mismo backend Nest (`ssgg`, prefijo `api/v3`) que usa `panel-admin-ag360ai`: JWT, marcas, órdenes, y luego sockets/chats.

## Orden de PRPs

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 007 | [ssgg-api-client-auth](./007--ssgg-api-client-auth.md) | Completed | Cliente HTTP + env + proxy + login |
| 008 | [ssgg-brands-orders](./008--ssgg-brands-orders.md) | Completed | Marcas + órdenes + status; mappers UI |
| 009 | [ssgg-orders-events-sockets](./009--ssgg-orders-events-sockets.md) | Completed | Socket.IO `/orders` + `/events` |
| 010+ | (futuro) | — | Chats socket; notificaciones inbox; productos |

## Backend hermano

| Repo | PRP | Tema |
|------|-----|------|
| `ssgg` | [200--mobile-admin-cors-origins](../../ssgg/PRPs/200--mobile-admin-cors-origins.md) | CORS Capacitor + `MOBILE_ADMIN_URL` |
| `ssgg` | [Epic connection](../../ssgg/PRPs/README--mobile-admin-connection-epic.md) | Visión conjunta |

## Dependencias

```
ssgg 200 (CORS) ──► 007 (api + signin)
007 ─────────────► 008 (brands + orders)
008 ─────────────► 009 (sockets orders/events)
009 ─────────────► chats / notificaciones (010+)
```

## Query params de órdenes (PRP 008)

`GET /orders` desde el móvil (mock off):

| Param | Valor |
|-------|--------|
| `subdomains` | `brand.subdomain` |
| `last12Hours` | `true` |
| `page` | `1` |
| `limit` | `100` |

Cambio de estado: `PUT /order-orchestration/:id/status` con `{ newStatus }` (labels API: `Pre Orden`, `Aceptado`, `En cocina`, `Para recoger`, `En camino`, `Entregado`, `Cancelado`).

---

## Decisiones de producto (v1)

| Tema | Decisión |
|------|----------|
| Fuente de verdad | `ssgg` (no inventar API móvil) |
| Patrón cliente | Adaptar `panel-admin-ag360ai/src/services/api.ts` + `authService` |
| Mock | Flag `VITE_USE_API_MOCK=true` para demos offline; default **false** en develop cuando haya backend |
| IDs UI | Mapear `_id` / `orderNumber` / statuses reales → tipos actuales del móvil |
| Capacitor device | `VITE_API_BASE_URL` absoluta (LAN / 10.0.2.2 / túnel); no `localhost` del host en teléfono físico |

## Cómo ejecutar

En Agent mode: *“Execute PRP 007”* / *“Implementa PRPs/007--ssgg-api-client-auth.md”*.  
Implementar **ssgg 200** antes o en paralelo si aparecen errores CORS en emulador.
