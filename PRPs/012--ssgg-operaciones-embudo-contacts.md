# PRP 012 — Operaciones: Embudo (contactos AgentState)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** Completed  
> **Depends on:** [007](./007--ssgg-api-client-auth.md), [008](./008--ssgg-brands-orders.md), [011](./011--ssgg-operaciones-orders-parity.md)  
> **UX previa:** [005](./005--ops-attention-queue.md) (chips Iniciando / Pidiendo / Humano)  
> **Branch target:** `develop`  
> **Epic:** [Conexión a ssgg](./README-ssgg-connection.md)  
> **Contraparte panel:** `panel-admin-ag360ai` → Operaciones → tab **Embudo** (`FunnelView` + `useContactInfo` + `GET /contact/list`)

---

## Implementation notes (2026-08-08)

- `contactService` + `parseContactListResponse` → `GET /contact/list`
- `funnelStage.ts` (misma lógica panel) + tests
- `apiFacade.listContacts` + mock demo
- `OperationsPage`: tabs **Embudo | Pedidos**; chips INICIAL/PIDIENDO/HUMANO/CON_PEDIDO; `ContactCard`
- Chat tap → toast stub (013)
- Default vista: Embudo

---

## Goal

Que en el móvil los focos **Iniciando / Pidiendo / Humano** (y la cola asociada) muestren **contactos del embudo** (`AgentState` / `ContactInfoDto`), con los mismos conteos y semántica que el panel web — no un subfiltro de `GET /orders`.

La cola de **pedidos** (Nuevos / En proceso / Entregado) del PRP 011 sigue existiendo; este PRP introduce (o corrige) la capa **Embudo**.

---

## Why

Hoy en móvil:

| Chip / label | Fuente real | Efecto |
|--------------|-------------|--------|
| Iniciando / Pidiendo / Humano | `getKanbanSubState(order)` sobre **órdenes** | Contadores ~1–pocos del día |
| Embudo panel “Iniciando” | `GET /contact/list` + `getKanbanPipelineStage` | Contadores ~decenas/cientos (ej. 158) |

Misma etiqueta, **distinta fuente de datos** → el operador cree que “falta data” o hay bug de conteo. No es bug de 011: 011 alineó **Órdenes**; el Embudo nunca se conectó.

Sin este PRP, Operaciones móvil solo sirve cocina/delivery; no sirve supervisión de conversaciones activas (el valor principal del Embudo).

---

## Estado actual (baseline)

| Capacidad | Móvil hoy | Panel Embudo |
|-----------|-----------|--------------|
| Listar contactos | No | `GET /contact/list?subDomain&page&limit&search…` |
| Agrupar columnas | N/A (chips = subestados de order) | `getKanbanPipelineStage` + `!isActive` → HUMANO |
| Columnas | Iniciando / Pidiendo / Humano (sobre orders) | INICIAL / PIDIENDO / HUMANO / CON_PEDIDO |
| Órdenes en embudo | N/A | CON_PEDIDO enlaza order por phone/number |
| Live contactos | No | Socket `contactInfoUpdated` (ChatContext) |
| Chat desde tarjeta | Placeholder / mock | Abre chat panel |
| Mock | Chips sobre mock orders | N/A |

**Conclusión:** reutilizar contrato panel; adaptar UX móvil (lista + chips, no kanban 4 columnas desktop).

---

## What

### User-visible (móvil)

1. En Operaciones, modo o sección **Embudo** (nombre UX a decidir; ver Decisiones): chips **Iniciando / Pidiendo / Humano** muestran conteos de **contactos**, alineados al panel (mismo subdomain).
2. La lista bajo esos chips son tarjetas de contacto (nombre, teléfono, último mensaje / actividad, badge unread si viene en DTO) — no `OrderCard` de cocina.
3. Modo **Pedidos** (011) permanece: Nuevos / En proceso / Entregado + filtros fecha/search de órdenes.
4. Tap en contacto: mínimo abrir ficha / detalle contacto; **abrir chat real** puede ser stub → PRP 013 (chats). No bloquear este PRP por inbox completo.
5. Mock on: embudo demo con contactos fake o chips deshabilitados con copy claro; no romper demo de pedidos.

### Technical

1. `contactService` (o `contactList.service`) → `GET /contact/list` con params panel (`page`, `limit` ~150, `subDomain`, `search?`, `branchId?`).
2. Tipos `ContactInfoDto` + meta (subset del panel; no copiar el archivo entero si sobra).
3. Util `getFunnelStage(contact)` portando lógica de:
   - `panel-admin-ag360ai/src/types/kanbanPipeline.ts` → `getKanbanPipelineStage`
   - Regla `!contact.isActive && !ORDER_PLACED|ORDER_SCHEDULED` → `HUMANO` (`useOperacionesData` groupedContacts)
4. `apiFacade.listContacts` + estado en `AppContext` o estado local en `OperationsPage` (preferir contexto si sockets 013 refrescarán).
5. UI: separar **foco embudo** vs **foco pedidos** para no mezclar conteos.
6. Opcional v1: columna/chip **Con pedido** (CON_PEDIDO) — si no cabe en UI, documentar defer; panel la tiene.
7. Live: opcional Fase C — escuchar evento de contactos si ya hay socket `/events` o namespace chat; si no, pull-to-refresh / refetch al volver a la tab. No exigir chat socket completo aquí.

---

## Decisiones (v1)

| Tema | Decisión |
|------|----------|
| Fuente chips Iniciando/Pidiendo/Humano | **Contactos** (`/contact/list`), no orders |
| Pedidos Nuevos/En proceso/Entregado | Siguen en **modo Pedidos** (011); no eliminar |
| UX separación | **Segmented control** o tabs internos: `Embudo` \| `Pedidos` (recomendado). Alternativa: Embudo = chips superiores; Pedidos = focos inferiores — solo si queda claro visualmente |
| CON_PEDIDO | Opcional en v1; si se omite, contactos con order placed pueden ir a lista “Con pedido” o filtrarse del embudo conversacional |
| Chat completo | Out of scope → **013** |
| `contactInfoUpdated` live | Nice-to-have Fase C; refetch manual basta para Done mínimo |
| Nuevos endpoints ssgg | No |
| Fecha embudo | Panel no filtra embudo por “hoy calendario” igual que orders; móvil **no** aplica `dateFrom` de pedidos al list contact. Search sí. |
| Roles / branchId | Replicar query `branchId` solo si el rol móvil ya lo expone; si no, subdomain completo como OWNER |

---

## Scope

### In Scope

- [ ] `contactService.list` + tipos + parse respuesta anidada `{ data: { data, meta } }` como panel
- [ ] Helper funnel stage (copia mínima de `kanbanPipeline` + regla isActive)
- [ ] Modo Embudo en `OperationsPage`: chips + lista contactos + conteos
- [ ] Modo Pedidos intacto (011)
- [ ] Search embudo → query `search` (debounce ~400 ms)
- [ ] Loading / empty / error i18n
- [ ] Mock path documentado
- [ ] PRP + README epic

### Out of Scope

- Chat WhatsApp / historial / enviar mensajes (013)
- Notificaciones inbox
- FunnelOrderCard / cambio status desde embudo
- Columna “No clientes” completa del panel
- Reservas / Yango / voucher
- Cambios Nest nuevos

---

## Success Criteria

1. Con mock off y marca con embudo activo en panel: chip **Iniciando** móvil ≈ conteo columna Iniciando del panel (misma marca; tolerancia paginación/limit).
2. Lista embudo no está vacía cuando el panel muestra decenas de contactos INICIAL.
3. Cambiar a modo **Pedidos** sigue mostrando órdenes del día (011) sin romper filtros.
4. Labels Iniciando/Pidiendo/Humano en modo Embudo **no** usan `getKanbanSubState` de orders.
5. `VITE_USE_API_MOCK=true`: app usable (pedidos demo; embudo mock o mensaje).
6. Sin regressión login / marcas / sockets orders.

---

## Implementation Blueprint

### Fase A — Servicio + grouping (sin UI grande)

1. Crear `src/services/contactService.ts` + tipos en `src/types/contact.ts` (o junto al service).
2. Endpoint: `GET /contact/list` vía `apiClient` (007).
3. Portar `getFunnelStage` a `src/utils/funnelStage.ts` (desde `kanbanPipeline.ts` + regla HUMANO inactivo).
4. Unit-style smoke: mapper con fixtures mínimas (opcional).
5. Exponer `apiFacade.listContacts(subDomain, params)`.

**Referencia panel:**

- `panel-admin-ag360ai/src/pages/Operaciones/services/contactList.service.ts` — `fetchListContactInfo`
- `panel-admin-ag360ai/src/pages/Operaciones/hooks/useContactInfo.ts`
- `panel-admin-ag360ai/src/pages/Operaciones/hooks/useOperacionesData.ts` — `groupedContacts` (~656–680)
- `panel-admin-ag360ai/src/types/kanbanPipeline.ts`

### Fase B — UI Operaciones dual

1. `OperationsPage`: control **Embudo | Pedidos**.
2. Embudo: chips `inicial` / `pidiendo` / `humano` (y opcional `con_pedido`) con `groupedContacts[stage].length`.
3. Lista: componente `ContactCard` (nuevo, liviano) — nombre, phone, preview lastMessage, unread.
4. Pedidos: comportamiento actual 011 sin cambios de contratos.
5. Refetch embudo al entrar modo / pull / cambio marca.
6. i18n: `operations.mode.funnel`, `operations.mode.orders`, empty states.

### Fase C — Refresh (opcional)

1. Si `/events` o namespace existente emite update de contactos usable sin chat stack → invalidar lista.
2. Si no: documentar “pull to refresh” y defer live a 013.

### Fase D — Puente a chat (stub)

1. Tap contacto → navegar a pantalla chat placeholder con `agentStateId` / phone en route state, o toast “Chat próximamente”.
2. No implementar send/history aquí.

---

## Tasks (orden sugerido)

1. [ ] Tipos + `contactService.list` + parse meta
2. [ ] `funnelStage.ts` + tests mentales / fixtures
3. [ ] `apiFacade` + carga en contexto o página
4. [ ] UI segmented Embudo | Pedidos
5. [ ] `ContactCard` + chips conteos embudo
6. [ ] Search debounce embudo
7. [ ] Mock / empty / error
8. [ ] Stub tap → chat futuro
9. [ ] Validar conteos vs panel misma marca
10. [ ] Marcar PRP Completed + README

---

## Validation

### Manual

1. Panel web → Operaciones → Embudo → anotar conteos Iniciando / Pidiendo / Humano (misma marca).
2. Móvil mock off → Operaciones → Embudo → comparar conteos (misma sesión/user si aplica).
3. Pedidos → sigue listando órdenes del día.
4. Search embudo filtra contactos.
5. Sin marca / error API → empty/error usable.

### Comandos

```bash
cd panel-admin-ag360ai-movile
npm run build
# Dev: VITE_USE_API_MOCK=false + proxy a ssgg
```

---

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Paginación: panel limit 150; totales meta vs length columna | Usar misma page/limit; mostrar “+” o load more si `hasNextPage` |
| Mezclar orders y contacts en una sola lista | Tabs/modos obligatorios en DoD |
| `conversationState` en root vs `sessionData` | Igual que panel: stage desde sessionData + flags isActive |
| Performance lista grande en móvil | Virtualizar después; v1 limit 150 ok |
| Expectativa de chat al tap | Stub explícito + PRP 013 |

---

## Definition of Done

- [ ] Modo Embudo con contactos reales y chips alineados al panel
- [ ] Modo Pedidos 011 sin regressión
- [ ] Sin endpoints nuevos en ssgg
- [ ] Mock no rompe demo
- [ ] README epic actualizado; Status → Completed

---

## Next

- **013** — Chats: historial + socket conversación + abrir desde `ContactCard`
- Notificaciones inbox (después o paralelo ligero)
