# PRP 013 — Chats: historial real + envío + socket `/chat`

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** Completed  
> **Depends on:** [007](./007--ssgg-api-client-auth.md), [009](./009--ssgg-orders-events-sockets.md), [012](./012--ssgg-operaciones-embudo-contacts.md)  
> **UX previa:** `ChatsPage` (inbox + thread + composer ya existen en mock)  
> **Branch target:** `develop`  
> **Epic:** [Conexión a ssgg](./README-ssgg-connection.md)  
> **Contraparte panel:** `panel-admin-ag360ai/src/services/chatService.ts` + socket `/chat` (`WEBSOCKET_FRONTEND_GUIDE.md`)

---

## Implementation notes (2026-08-08)

- `chatService`: history (phone / agent-state), send (`provider: meta`), mark-as-read
- `chatMapper` + tests; inbox vía `GET /contact/list` (misma 012)
- `ChatSocketProvider`: `/chat` + `join` subdomain + `joinAgentStatesRoom`; `newMessage` / `contactInfoUpdated`
- `ChatsPage` API real; deep-link `?phone=` / `?agentStateId=`
- Embudo / pedidos con phone → abren thread

---

## Goal

Que la pestaña **Chats** del móvil use la API real de ssgg (lista de conversaciones, historial, envío, mark-as-read) y reciba mensajes en vivo por Socket.IO `/chat`, cerrando el stub de 012 (“Chat próximamente”) desde el Embudo.

La UI móvil (lista → thread → composer) se mantiene; se cambia la **capa de datos** y el deep-link desde Operaciones.

---

## Why

- `ChatsPage` hoy llama solo `apiMock.getChats` / `getChatMessages` / `sendChatMessage` aunque mock esté off → inbox demo, no WhatsApp real.
- Embudo 012 ya tiene `ContactInfo` con phone / `_id` (agentState); el tap no abre chat.
- El panel ya tiene contratos estables:
  - Inbox / embudo: `GET /contact/list`
  - Historial: `GET /chats/history/:phone/:subDomain` o `GET /chats/history/agent-state/:id`
  - Envío: `POST /chats/send-message`
  - Leído: `PUT /contact/mark-as-read`
  - Live: namespace `/chat` → `newMessage`, `contactInfoUpdated`
- Sin esto el operador no puede atender humanos desde el móvil.

---

## Estado actual (baseline)

| Capacidad | Móvil hoy | Panel / ssgg |
|-----------|-----------|--------------|
| Inbox lista | `apiMock.getChats` | `GET /contact/list` (o last-messages) |
| Abrir thread | mock messages por `chatId` | historial por phone o agentStateId |
| Enviar | mock local | `POST /chats/send-message` `{ subDomain, clientPhone, message, provider }` |
| Mark read | No | `PUT /contact/mark-as-read` |
| Live | No | Socket `/chat` |
| Deep-link desde ops | `?customer=nameKey` mock | phone / agentStateId |
| Embudo → chat | Toast stub (012) | Abre ChatMessageView |
| Toggle bot por chat | Badge mock | `updateChatStatus` / `isActive` vía contactInfo |

---

## What

### User-visible

1. Inbox Chats con contactos reales de la marca (nombre, phone, preview, unread, bot on/off).
2. Abrir conversación → historial real (burbujas cliente / agente / bot).
3. Composer envía mensaje a WhatsApp vía ssgg; aparece en el thread (optimista + confirmación / socket).
4. Desde Embudo (`ContactCard`) → abre el thread de ese contacto (sin toast “próximamente”).
5. Mensajes nuevos en vivo mientras el thread (o inbox) está abierto.
6. Mock on: comportamiento demo actual intacto.

### Technical

1. `chatService` móvil:
   - `listConversations` → reutilizar `contactService.list` / `apiFacade.listContacts` (misma fuente que embudo) **o** `GET /chats/last-messages/:subDomain` si se prefiere inbox liviano — **decisión v1: `/contact/list`** (una sola fuente, unread + isActive).
   - `getHistory({ phone, subDomain })` y/o `getHistoryByAgentStateId(id)`
   - `sendMessage(dto)`
   - `markAsRead({ clientPhone, subDomain, messageIds? })`
2. Mappers: `ContactInfo` → `ChatConversation` UI; mensajes API → `ChatMessage` (roles `customer` | `agent` | `bot`).
3. `apiFacade` wrappers + mock path.
4. `ChatSocketProvider` (o extender sockets): `io(.../chat)` con `auth: { token }`, join/room por subdomain según guía ssgg; listeners `newMessage` + `contactInfoUpdated`.
5. Deep-link: `?phone=` y/o `?agentStateId=` (deprecar dependencia de `nameKey` mock; mantener compat mock).
6. Operaciones: `openContactChat` → `setChatNavFrom` + `go(CHATS_PATH?phone=...)`.

---

## Decisiones (v1)

| Tema | Decisión |
|------|----------|
| Fuente inbox | `GET /contact/list` (misma 012), limit 150, search server |
| Historial preferido | `agentStateId` si hay `_id`; fallback phone + subDomain |
| `provider` en send | Valor que use el panel (típicamente el del bot/WhatsApp de la marca; investigar en implementación — no hardcodear a ciegas) |
| Adjuntos / imágenes | Out of scope v1 (solo texto) |
| Toggle bot por conversación | Nice-to-have; mínimo mostrar `isActive` desde contacto |
| Notificaciones inbox (campana) | Out → 014 |
| Namespace | `/chat` aparte de `/orders`+`/events` (009) |
| Nuevos endpoints ssgg | No |

---

## Scope

### In Scope

- [ ] `chatService` + mappers + tests parse/map
- [ ] `apiFacade` getChats / getMessages / send / markRead
- [ ] `ChatsPage` cableado a API real (mock flag)
- [ ] Socket `/chat` + append mensaje / refresh contacto
- [ ] Deep-link phone/agentStateId desde Embudo + pedidos (si phone en order)
- [ ] Mark-as-read al abrir thread (si hay unread / messageIds)
- [ ] i18n errores send/load
- [ ] PRP + README epic

### Out of Scope

- Multimedia / documentos / ubicación
- Plantillas WhatsApp / quick replies avanzados
- Transferencia agente / claim humano completo (más allá de ver isActive)
- Inbox notificaciones campana (014)
- Sonidos nativos Capacitor
- Reservas / Yango

---

## Success Criteria

1. Mock off + marca con chats: inbox no vacío si embudo tiene contactos.
2. Abrir contacto → historial coincide con panel (misma conversación).
3. Enviar texto → llega al cliente (o al menos 200/201 + aparece en historial/socket).
4. Embudo → tap chat abre thread correcto (phone/agentStateId).
5. `newMessage` del socket refresca thread abierto sin pull manual.
6. Mock on: demo ChatsPage sin romper.
7. Logout desconecta `/chat`.
8. Build + unit tests mappers OK.

---

## Implementation Blueprint

### Fase A — Servicio HTTP + mappers

1. `src/services/chatService.ts` (endpoints arriba).
2. `src/services/mappers/chatMapper.ts`: ContactInfo → ChatConversation; API Message → ChatMessage.
3. Extender tipos UI si hace falta (`displayName`, `agentStateId`, `subDomain`, quitar dependencia de solo `nameKey`).
4. `apiFacade` + mock sin cambios de contrato demo.

**Refs panel:**

- `panel-admin-ag360ai/src/services/chatService.ts`
- `panel-admin-ag360ai/src/response-types/chats/chat.ts` (`SendMessageFromFrontendDto`, `Message`)
- `ssgg/src/websocket/WEBSOCKET_FRONTEND_GUIDE.md` (§ `/chat`)

### Fase B — ChatsPage real

1. Cargar inbox con `listContacts` / facade al tener brand.subdomain.
2. Thread: history by agentStateId || phone.
3. Send + optimistic UI + error toast.
4. Mark read al abrir.
5. Query `phone` / `agentStateId` / (legacy `customer` mock).

### Fase C — Socket `/chat`

1. Provider hermano de `OrdersSocketProvider` (o unificar `RealtimeSocketsProvider` sin mezclar lógica).
2. `newMessage`: si match conversación abierta → append; si no → bump unread inbox.
3. `contactInfoUpdated`: upsert fila inbox / bot badge.
4. Mock off only; cleanup logout / unmount.

### Fase D — Puente Embudo

1. `OperationsPage.openContactChat` → navegar Chats con params.
2. Pedidos: si `order.phone` → mismo deep-link (opcional, mismo PRP si trivial).

---

## Tasks (orden sugerido)

1. [ ] Tipos chat UI + mapper ContactInfo
2. [ ] `chatService` history / send / markRead
3. [ ] `apiFacade` + mock branch
4. [ ] Cablear `ChatsPage` lista + thread + send
5. [ ] Deep-link + Embudo bridge
6. [ ] `ChatSocketProvider` newMessage + contactInfoUpdated
7. [ ] Mark-as-read + i18n errores
8. [ ] Tests mapper/parse + build
9. [ ] Marcar Completed + README

---

## Validation

### Manual

1. Panel: abrir chat de un teléfono; móvil misma marca → mismo historial.
2. Enviar desde móvil → ver en panel / WhatsApp.
3. Mensaje entrante → aparece en móvil con socket sin refrescar.
4. Embudo → icono chat → thread.
5. Mock on → demo previa.

### Comandos

```bash
cd panel-admin-ag360ai-movile
npm run test.unit -- --run src/services/mappers/chatMapper.test.ts
npm run build
```

---

## Risks

| Riesgo | Mitigación |
|--------|------------|
| `provider` incorrecto en send | Copiar valor exacto del panel al enviar desde Operaciones |
| Phone encoding en URL (`+51…`) | `encodeURIComponent`; history path encoding |
| Rooms socket: ¿join subdomain? | Leer gateway `chat.gateway.ts` al implementar; no asumir solo auth |
| Duplicar mensajes optimistic + socket | Dedupar por `_id` |
| Lista 150 vs “todos los chats” | Misma paginación que 012; load-more si hace falta después |

---

## Definition of Done

- [ ] ChatsPage sin `apiMock` directo cuando mock off
- [ ] Historial + send + mark-read reales
- [ ] Socket `/chat` conectado con sesión
- [ ] Embudo abre chat real
- [ ] Mock demo OK
- [ ] README epic; Status → Completed

---

## Next

- **014** — Notificaciones inbox (campana) desde `/events` + persistencia leve
- Productos / locales API (después)
