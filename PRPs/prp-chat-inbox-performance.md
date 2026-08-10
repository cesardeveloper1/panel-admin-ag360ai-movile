# PRP: Bandeja de chats rápida y actualizaciones incrementales

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-10  
> **Status:** Draft  
> **Pattern:** B (mejora de flujo existente)

## 1. Project Overview

Optimizar la carga de la bandeja de conversaciones para que el usuario vea datos útiles inmediatamente y los eventos en tiempo real no provoquen recargas completas de hasta 150 contactos.

## 2. Problem Statement

Los agentes esperan demasiado cuando entran a Chats o cuando llega un mensaje de otra conversación. Actualmente cada evento ajeno al hilo activo puede ejecutar nuevamente `GET /contact/list`, generando latencia, tráfico y renders innecesarios.

## 3. Success Criteria

- [ ] La última bandeja válida aparece inmediatamente al volver a Chats.
- [ ] Un evento de una conversación existente actualiza solo ese elemento, sin llamar `GET /contact/list`.
- [ ] Las búsquedas rápidas no dejan respuestas antiguas sobrescribiendo resultados nuevos.
- [ ] Medir y registrar p50/p95 de carga inicial y refresh de bandeja antes y después.

## 4. User Stories

- Cuando vuelvo a Chats, quiero ver mi bandeja anterior mientras sincroniza, para no esperar una pantalla vacía.
- Cuando llega un mensaje, quiero que se actualice su conversación sin recargar toda la lista.
- Cuando cambio la búsqueda rápidamente, quiero ver únicamente el resultado más reciente.

## 5. Functional Requirements

### P0

- FR-001: Mantener en memoria la última respuesta por `subDomain` y término de búsqueda.
- FR-002: Hidratar `items` desde esa caché antes de iniciar el refresh de red.
- FR-003: En `contactInfoUpdated`, hacer merge por `_id`, teléfono o `clientBsuid`.
- FR-004: Si el evento corresponde a un contacto nuevo, insertarlo al inicio sin recargar toda la bandeja.
- FR-005: Distinguir `isInitialLoading` de `isRefreshing` para no desmontar la lista durante un refresh.
- FR-006: Evitar respuestas fuera de orden mediante request id o `AbortController`.

### P1

- FR-007: Debounce de búsqueda configurable, manteniendo una única petición activa.
- FR-008: Programar un refresh completo solo como fallback cuando el evento no tenga datos suficientes para hacer merge.
- FR-009: Limitar el refresh fallback con throttle/debounce para evitar ráfagas.

## 6. Non-Functional Requirements

- NFR-001: La actualización de un contacto no debe superar un render de la lista por evento.
- NFR-002: No aumentar el número de listeners del socket por navegación.
- NFR-003: No exponer teléfonos o contenido de mensajes en logs de producción.
- NFR-004: Mantener compatibilidad con `config.useApiMock`.

## 7. Technical Constraints

- Usar React state/hooks existentes y `apiFacade`; no introducir una librería de caché global sin aprobación.
- El contrato actual de `ContactInfo` es la fuente del merge.
- Si se añade `signal`, propagarlo desde `api.ts` sin romper `api.get` existente.
- Mantener mobile-first y la navegación Ionic actual.

## 8. Data Requirements

- Clave de caché: `subDomain + search normalizada`.
- Datos mínimos de merge: `_id`, `clientPhone`, `clientBsuid`, `subDomain`, `isActive`, `lastMessageContent`, `lastMessageAt`, `unreadMessages`.
- Invalidación: cambiar de marca, cerrar sesión o logout debe limpiar la caché.

## 9. UI/UX Requirements

- Mostrar la lista cacheada con una señal discreta de sincronización, sin spinner de pantalla completa.
- Mantener el orden actual salvo que un contacto actualizado deba ir al inicio según la regla existente.
- Mostrar el estado vacío solo cuando no haya caché y la petición haya terminado.
- No modificar la interacción de búsqueda, tarjetas ni navegación al hilo.

## 10. Risks & Assumptions

- Riesgo: un payload parcial puede dejar campos antiguos. Mitigación: merge conservador y refresh fallback.
- Riesgo: caché desactualizada. Mitigación: marcarla stale y refrescar en segundo plano.
- Supuesto: `contactInfoUpdated` representa el estado más reciente del contacto.
- Dependencia: backend debe incluir identidad estable en el evento.

## 11. Out of Scope

- Cambiar el contrato de autorización o el endpoint de contactos.
- Optimizar consultas MongoDB/backend en este PRP.
- Paginación de historial de mensajes.
- Rediseñar la UI de la bandeja.

## 12. Open Questions

- ¿El backend garantiza que cada `contactInfoUpdated` incluye siempre `_id` y `lastMessageContent`?
- ¿Cuál es el TTL aceptable de la caché por marca?
- ¿Se necesita persistir la bandeja entre reinicios de la app o solo durante la sesión?

## Implementation Blueprint

### Files likely to change

```yaml
- src/pages/ChatsPage.tsx: separar carga inicial, refresh y merge de eventos.
- src/context/ChatSocketProvider.tsx: conservar payload completo y filtrar por marca.
- src/services/api.ts: aceptar AbortSignal si se confirma necesario.
- src/services/apiFacade.ts: exponer carga con señal/request id.
- src/i18n/locales/es.json: texto de sincronización si se muestra.
- src/i18n/locales/en.json: traducción equivalente.
```

### Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run test.unit -- --run
npm run build
```

Manual: entrar/salir de Chats, cambiar búsqueda rápidamente, recibir eventos de la conversación abierta y de otra conversación, cambiar de marca y cerrar sesión.

