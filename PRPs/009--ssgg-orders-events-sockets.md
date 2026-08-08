# PRP: Sockets en tiempo real (/orders + /events)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** Completed  
> **Depends on:** [007](./007--ssgg-api-client-auth.md), [008](./008--ssgg-brands-orders.md), `ssgg` [200](../../ssgg/PRPs/200--mobile-admin-cors-origins.md)  
> **Branch target:** `develop`  
> **Epic:** [Conexión a ssgg](./README-ssgg-connection.md)

---

## Implementation notes (Completed 2026-08-08)

- `socket.io-client` + `OrdersSocketProvider` (montado en `App.tsx`).
- Conecta `/orders` y `/events` con JWT + `brandId` / `brandSubdomain`.
- Filtro de marca + `refreshOrders` debounced; toast `toast.socketNewOrder`.
- Mock off obligatorio; sin chat/reservations/yango.

---

## Goal

Conectar Socket.IO a `ssgg` namespaces `/orders` y `/events` cuando hay sesión JWT + marca seleccionada y mock off, de modo que Operaciones/Cocina se actualicen sin pull manual al crear/cambiar pedidos.

---

## Why

- Tras 008 los datos son reales pero estáticos hasta `refreshOrders`.
- El panel web ya usa `SocketProvider` con el mismo contrato (`auth.token`, query `brandId` / `brandSubdomain` / `role`).
- Tiempo real es el siguiente corte de valor operativo en móvil.

---

## What

### User-visible

1. Con mock off + marca activa: nuevos pedidos / cambios de estado aparecen en la cola sin recargar.
2. Toast breve ante `order_created` (opcional `order_status_changed`).
3. Mock on: sin sockets (cero ruido en demos).
4. Logout / cambio de marca: desconecta y reconecta con el nuevo contexto.

### Technical

1. Dependencia `socket.io-client` (^4.8).
2. `OrdersSocketProvider` bajo `AppProvider`:
   - `io(`${socketBase}/orders`)` + `/events`
   - `auth: { token }` desde `auth_token`
   - query: `role`, `brandId`, `brandSubdomain`
3. Filtro de marca (`orderSocketEventMatchesBrand`) como el panel.
4. Al evento de orden relevante → `refreshOrders` debounced (~300 ms).
5. Resolver `socketBase` desde `VITE_SOCKET_BASE_URL` o derivar de `VITE_API_BASE_URL` / same-origin (proxy Vite).

### Out of scope

- `/chat`, `/reservations`, `/yango-claims`
- Impresión térmica / print bridge
- Sonidos nativos (Capacitor) más allá de toast

### Success Criteria

- [x] Con mock off, socket `/orders` conecta tras elegir marca
- [x] `order_created` / `order_status_changed` de la marca activa refrescan la lista
- [x] Eventos de otra marca se ignoran
- [x] Mock on: no intenta conectar
- [x] Logout desconecta
- [x] lint + tsc OK

---

## Implementation Blueprint

```yaml
Task 1: npm install socket.io-client@^4.8.3
Task 2: orderSocketBrandScope.ts + resolveSocketBaseUrl
Task 3: OrdersSocketProvider.tsx
Task 4: Montar en App.tsx dentro de AppProvider
Task 5: Documentar en README-ssgg-connection + .env.example
```
