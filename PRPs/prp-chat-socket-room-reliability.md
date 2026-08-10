# PRP: Socket de chats resiliente y salas de historial

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-10  
> **Status:** Draft  
> **Pattern:** B (integración en tiempo real)

## 1. Project Overview

Hacer confiable la suscripción al socket de chats y a la sala de historial activa, especialmente durante conexiones lentas, reconexiones y apertura inmediata de una conversación.

## 2. Problem Statement

`joinHistoryRoom` actualmente sale sin efecto si el socket aún no está conectado. Además, al reconectar no se vuelve a unir explícitamente a la sala activa. Esto puede producir historial en tiempo real incompleto y la percepción de que el chat tarda o deja de actualizarse.

## 3. Success Criteria

- [ ] Abrir un chat antes de conectar el socket termina uniéndolo cuando la conexión queda lista.
- [ ] Después de una reconexión, la sala activa se reingresa automáticamente.
- [ ] Existe como máximo una conexión `/chat` y un listener por evento y marca.
- [ ] Los eventos de otra marca se descartan sin actualizar React.
- [ ] Se registran métricas de conexión, reconexión y tiempo hasta `join` sin PII.

## 4. User Stories

- Cuando mi red cambia, quiero que el chat vuelva a actualizarse solo.
- Cuando abro un chat inmediatamente, quiero recibir sus nuevos mensajes aunque el socket todavía esté conectando.
- Como agente, quiero que una marca nunca reciba eventos de otra marca.

## 5. Functional Requirements

### P0

- FR-001: Guardar la sala de historial deseada en un ref del provider.
- FR-002: `joinHistoryRoom` debe emitir inmediatamente si está conectado o dejar la sala pendiente si no lo está.
- FR-003: En `connect`, emitir `join`, `joinAgentStatesRoom` y la sala pendiente.
- FR-004: En cada reconexión, volver a unir la sala pendiente actual.
- FR-005: Al cambiar de conversación, reemplazar la sala pendiente anterior; no acumular salas.
- FR-006: Limpiar la sala pendiente durante logout, cambio de marca y cleanup.

### P1

- FR-007: Exponer estado mínimo `connected/reconnecting` para una UI no bloqueante.
- FR-008: Usar backoff con jitter y límites explícitos para reconexión.
- FR-009: Si el servidor confirma error de join, conservar fallback REST y mostrar estado no bloqueante.

## 6. Non-Functional Requirements

- NFR-001: No duplicar listeners al cambiar de marca o sesión.
- NFR-002: El manejo de socket no debe bloquear la carga inicial REST.
- NFR-003: El payload de logs no debe contener teléfono, contenido ni token.
- NFR-004: Mantener fallback polling para redes que no soporten WebSocket.

## 7. Technical Constraints

- Implementar sobre `src/context/ChatSocketProvider.tsx` y `socket.io-client` existente.
- No crear sockets por cada conversación.
- Mantener namespace `/chat`, eventos `join`, `joinAgentStatesRoom`, `joinChatHistoryRoom`, `newMessage` y `contactInfoUpdated`.
- Respetar `config.useApiMock`.

## 8. Data Requirements

- Sala pendiente: `subDomain`, opcionalmente `phoneNumber`, opcionalmente `agentStateId`.
- Contexto de conexión: `session.role`, `brand.id`, `brand.subdomain`.
- Métricas: timestamps monotónicos de conexión y join, sin identificadores PII.

## 9. UI/UX Requirements

- No mostrar un spinner de pantalla completa por una reconexión.
- El historial REST debe seguir visible mientras se repara el tiempo real.
- Si se expone estado, usar un indicador discreto de “reconectando” y recuperar automáticamente.

## 10. Risks & Assumptions

- Riesgo: duplicar mensajes tras rejoin. Mitigación: deduplicación por id en `ChatsPage`.
- Riesgo: el backend no confirma `join`. Mitigación: emitir de forma idempotente y conservar REST.
- Supuesto: una sola sala de historial es suficiente para la vista activa.
- Dependencia: contrato de eventos existente en `ssgg`.

## 11. Out of Scope

- Cambiar el proveedor de Socket.IO.
- Crear sincronización offline completa.
- Rediseñar la cabecera o composer del chat.
- Optimizar sockets de pedidos/reportes salvo que compartan un bug reproducible.

## 12. Open Questions

- ¿El backend emite un evento de confirmación para `joinChatHistoryRoom`?
- ¿La sala acepta `agentStateId` como identidad principal en todos los casos?
- ¿Qué duración máxima de reconexión debe mantener la app abierta?

## Implementation Blueprint

### Files likely to change

```yaml
- src/context/ChatSocketProvider.tsx: sala pendiente, rejoin y estado de conexión.
- src/pages/ChatsPage.tsx: solicitar sala sin carrera y deduplicar mensajes.
- src/i18n/locales/es.json: estado de reconexión si se presenta.
- src/i18n/locales/en.json: traducción equivalente.
```

### Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run test.unit -- --run
npm run build
```

Manual: throttling de red, abrir conversación durante connecting, desconectar/reconectar, cambiar de marca y comprobar que no haya duplicados.

