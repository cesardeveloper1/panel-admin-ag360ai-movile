# PRP: Historial de chats con carga progresiva

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-10  
> **Status:** Draft  
> **Pattern:** B/C (evolución coordinada frontend-backend)

## 1. Project Overview

Reducir el tiempo percibido al abrir una conversación cargando primero los mensajes recientes y permitiendo recuperar mensajes antiguos bajo demanda.

## 2. Problem Statement

Abrir una conversación espera la respuesta completa de historial antes de mostrar el contenido. En conversaciones largas, el tiempo de red, serialización y render aumenta y el usuario interpreta que el chat está detenido.

## 3. Success Criteria

- [ ] El primer mensaje reciente visible aparece en menos de 1.5 s en p95 bajo red móvil definida.
- [ ] El historial completo no se solicita en una única respuesta ilimitada.
- [ ] El usuario puede desplazarse hacia arriba para cargar mensajes antiguos sin perder la posición.
- [ ] Mensajes nuevos del socket se integran sin reordenamientos visibles ni duplicados.

## 4. User Stories

- Cuando abro un chat, quiero ver los últimos mensajes primero, para poder responder rápidamente.
- Cuando necesito contexto antiguo, quiero cargarlo al desplazarme hacia arriba.
- Cuando llega un mensaje nuevo mientras leo, quiero que aparezca sin perder mi posición.

## 5. Functional Requirements

### P0

- FR-001: Definir paginación del historial por cursor o `before` con límite explícito.
- FR-002: Solicitar una primera página de mensajes recientes al abrir el chat.
- FR-003: Renderizar la primera página sin esperar páginas antiguas.
- FR-004: Cargar páginas anteriores al alcanzar el inicio del contenedor.
- FR-005: Mantener un estado por chat: `initialLoading`, `loadingOlder`, `hasMore`, `error`.
- FR-006: Deduplicar por id al combinar REST, socket y páginas anteriores.
- FR-007: Preservar scroll al anteponer mensajes antiguos.

### P1

- FR-008: Cancelar la petición de una conversación al cambiar a otra.
- FR-009: Cachear la última página por conversación durante la sesión.
- FR-010: Reintentar una página fallida sin borrar los mensajes ya visibles.

## 6. Non-Functional Requirements

- NFR-001: Renderizar únicamente las páginas necesarias; no introducir virtualización sin medir.
- NFR-002: Límite recomendado inicial: 30–50 mensajes por página, validado con backend.
- NFR-003: El historial debe funcionar en móvil, tablet y escritorio.
- NFR-004: Las métricas deben separar tiempo de API, parseo y primer render.

## 7. Technical Constraints

- Revisar primero `src/services/chatService.ts` y los endpoints de historial en `ssgg`.
- Si el backend actual solo devuelve lista completa, crear un PRP backend coordinado antes de cambiar el frontend.
- Mantener `ChatMessage`, `mapApiMessageToChatMessage` y el socket actual.
- No cambiar la semántica de mensajes enviados ni adjuntos.

## 8. Data Requirements

- Cursor: `createdAt + id` o cursor opaco del backend; no usar solo índice.
- Respuesta: `data`, `nextCursor`/`hasMore`, opcionalmente `total`.
- Orden canónico: ascendente para render, cursor descendente para pedir antiguos.
- Identidad: `chatId`, `agentStateId`, teléfono y subdominio según contrato existente.

## 9. UI/UX Requirements

- El estado inicial debe mostrar loader compacto dentro del contenedor del hilo.
- “Cargar mensajes anteriores” puede ser automático al scroll o un control accesible; decidir según medición de scroll.
- No saltar al final si el usuario está leyendo mensajes antiguos.
- Mantener la cabecera fija y el composer visible como ya exige el flujo actual.

## 10. Risks & Assumptions

- Riesgo: cambios de orden por mensajes con timestamps iguales. Mitigación: ordenar por `createdAt` e id estable.
- Riesgo: endpoint sin cursor. Mitigación: PRP backend previo con contrato versionado.
- Riesgo: pérdida de posición al anteponer. Mitigación: medir `scrollHeight` antes/después y compensar delta.
- Supuesto: el backend puede devolver mensajes recientes ordenables.

## 11. Out of Scope

- Búsqueda global dentro de mensajes.
- Exportación de conversaciones.
- Cambiar el almacenamiento histórico o política de retención.
- Sincronización offline completa.

## 12. Open Questions

- ¿Qué endpoint actual usa `getHistoryByAgentStateId` y admite paginación?
- ¿El backend puede aceptar cursor opaco sin romper consumidores existentes?
- ¿Cuál es el tamaño medio y máximo de los historiales reales?
- ¿Se requiere conservar scroll exacto al rotar pantalla o cerrar/reabrir el hilo?

## Implementation Blueprint

### Files likely to change

```yaml
- src/services/chatService.ts: parámetros y respuesta paginada.
- src/services/apiFacade.ts: exponer cursor y abort signal.
- src/pages/ChatsPage.tsx: estado por página, scroll y merge.
- src/types/index.ts: tipos de cursor/respuesta si son necesarios.
- src/theme/agiliza.css: loader compacto y control de carga anterior.
- ssgg: endpoint paginado y pruebas de contrato (PRP coordinado requerido si aplica).
```

### Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run test.unit -- --run
npm run build
```

Manual: historial de 20, 100 y 1000 mensajes; red lenta; scroll arriba/abajo; mensaje nuevo durante paginación; cambio rápido entre conversaciones.

