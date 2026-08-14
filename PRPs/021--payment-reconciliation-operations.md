# PRP: Operación Android de pagos analizados por SSGG

> **Proyecto:** panel-admin-ag360ai-movile
> **Versión:** 1.0
> **Fecha:** 2026-08-12
> **Estado:** Draft
> **Patrón:** B — operación financiera móvil
> **Epic:** `018--tradingtracker-payment-capture-and-reconciliation.md`
> **Depende de:** `020--tradingtracker-device-delivery.md` y `ssgg/PRPs/202--payment-reconciliation-tradingtracker.md`

## 1. Project Overview

Agregar dentro del APK Android la bandeja operativa de conciliaciones ya analizadas por `ssgg`. La pantalla separará claramente la captura/entrega local del resultado financiero y permitirá resolver coincidencias ambiguas según RBAC.

## 2. Problem Statement

Que TradingTracker confirme recepción no significa que el pago corresponda a una orden. Sin una vista basada en el estado persistido por `ssgg`, el operador podría interpretar un evento enviado como pago confirmado o presionar repetidamente acciones financieras.

## 3. Success Criteria

- Ningún evento se muestra como confirmado antes de `PAID` persistido por `ssgg`.
- Ambigüedades muestran candidatos y requieren decisión explícita.
- Doble tap o reconexión no duplica confirmaciones.
- REST y socket convergen al mismo estado tras pérdida de conectividad.
- La lista sigue siendo usable en teléfonos pequeños y con descripciones largas.
- Solo roles/permisos autorizados pueden asignar, confirmar o rechazar.

## 4. User Stories (Jobs-to-be-Done)

- Cuando llega un pago, quiero saber si fue solo capturado o ya validado.
- Cuando dos órdenes tienen el mismo monto, quiero comparar candidatos antes de confirmar.
- Cuando el backend ya procesó mi acción, quiero ver el resultado real aunque haya perdido el ACK.
- Cuando el capturador falla, quiero distinguirlo de una conciliación sin orden.

## 5. Functional Requirements

### P0

- **FR-001:** Crear servicio de conciliaciones exclusivamente contra `ssgg` usando el cliente autenticado existente.
- **FR-002:** Modelar estados discriminados: `received`, `matching`, `matched`, `ambiguous`, `confirming`, `confirmed`, `rejected`, `orphan`, `failed`.
- **FR-003:** Mostrar tabs `Por revisar`, `Confirmados`, `Sin coincidencia` y `Todos` con paginado/infinite scroll.
- **FR-004:** Mostrar proveedor, monto/moneda, hora, pagador enmascarado, estado y orden propuesta.
- **FR-005:** Mostrar razón del resultado usando códigos backend traducibles; no analizar mensajes libres.
- **FR-006:** Para `ambiguous`, consultar candidatos y mostrar orden, cliente enmascarado, monto y distancia temporal.
- **FR-007:** Permitir seleccionar candidato, confirmar o rechazar únicamente con permiso granular.
- **FR-008:** No aplicar confirmación optimista; usar `Confirmando…` hasta ACK.
- **FR-009:** Bloquear acciones por transacción durante mutación y enviar clave idempotente/version cuando el contrato lo admita.
- **FR-010:** Ante 409/timeout, refrescar transacción y orden antes de ofrecer reintento.
- **FR-011:** Escuchar socket por marca/local y aplicar versión/`updatedAt` para ignorar eventos viejos.
- **FR-012:** Reconciliar por REST al reconectar o volver a foreground.
- **FR-013:** Actualizar tarjetas/resumen/detalle de orden afectados sin reload completo.
- **FR-014:** Vincular visualmente el estado local `captured/sent` con el remoto solo por IDs contractuales, nunca por monto/hora en el cliente.
- **FR-015:** Mantener empty state con icono y texto breve y estados de carga/error existentes.

### P1

- **FR-016:** Filtro por proveedor y local para usuarios multi-local.
- **FR-017:** Diagnóstico cruzado “capturado pero no recibido por SSGG” sin mostrar payload.
- **FR-018:** Notificación local/push para elementos que requieren revisión.

## 6. Non-Functional Requirements

- No guardar conciliaciones financieras completas en localStorage.
- Caché en memoria/React Query y persistencia mínima segura si se requiere offline read-only.
- Touch targets ≥44 px, texto accesible y estado no dependiente solo de color.
- Lista virtualizada/paginada para volumen alto.
- Sin PII en analytics/logs.
- Mutaciones idempotentes y recuperables.

## 7. Technical Constraints

- Ionic React dentro de Capacitor Android.
- Reutilizar `apiFacade`, autenticación nativa, socket y patrones de AppContext/React existentes.
- TradingTracker se usa para pairing/entrega/estado del dispositivo; los resultados y acciones financieras siempre pasan por `ssgg`.
- Diseñar únicamente para ejecución dentro del APK Android.

## 8. Data Requirements

```ts
type ReconciliationItem =
  | { status: 'received' | 'matching'; id: string; source: string; amountMinor: number; currency: string }
  | { status: 'matched'; id: string; proposedOrder: OrderRef; score: number }
  | { status: 'ambiguous'; id: string; candidates: OrderCandidate[] }
  | { status: 'confirmed'; id: string; order: OrderRef; confirmedAt: string; mode: 'automatic' | 'manual' }
  | { status: 'rejected' | 'orphan' | 'failed'; id: string; reasonCode: string };
```

El mapper tolerará versión desconocida mostrando un fallback seguro sin habilitar acciones.

## 9. UI/UX Requirements

- Jerarquía compacta: monto y estado primero; proveedor/hora después.
- `Capturado`, `Enviado` y `Pago confirmado` deben usar textos/colores diferentes.
- Ambiguo usa tarjeta prioritaria y CTA `Revisar`, no `Confirmar` directo.
- Comparador de candidatos en bottom sheet con contenido ajustado a pantalla y scroll interno.
- Botones financieros permanecen visibles sin tapar contenido y muestran progreso por item.
- Feedback háptico solo después de confirmación persistida.

## 10. Risks & Assumptions

- **Socket duplicado/fuera de orden:** versión y REST.
- **Doble tap:** mutex visual + idempotencia backend.
- **Pagador distinto al cliente:** nombre se presenta como dato auxiliar.
- **Monto igual repetido:** nunca desempatar en el cliente.
- **Evento local sin remoto:** mostrarlo en diagnóstico, no en bandeja financiera como confirmado.
- **Supuesto:** `ssgg` expone scopes, candidatos y reason codes estables.

## 11. Out of Scope

- Calcular matching en Android.
- Confirmar directamente contra TradingTracker.
- Mostrar `rawMessage`.
- Configurar umbrales de matching.
- Cualquier plataforma distinta de Android.
- Pagos parciales, devoluciones o contracargos.

## 12. Open Questions

- ¿Worker puede resolver ambiguos o solo manager/owner? Responsable: Producto/RBAC.
- ¿Se confirma orden inmediatamente al resolver candidato? Recomendación: una acción backend atómica de asignar+confirmar.
- ¿Sonido/push para revisión? Responsable: Operaciones.
- ¿Cuánto historial muestra móvil? Recomendación MVP: 24–72 h con paginación.

## Implementation Blueprint

1. Contratos/mappers y fixtures de estados.
2. Lista y filtros read-only en shadow mode.
3. Socket y reconciliación REST.
4. Bottom sheet de candidatos.
5. Mutaciones con RBAC/idempotencia/409.
6. Actualización selectiva de órdenes.
7. Pruebas Android E2E y rollout gradual.

## Validation Loop

- Unit tests de todos los estados y versiones desconocidas.
- Tests de socket duplicado, fuera de orden y reconexión.
- Tests de doble tap, timeout y 409.
- Tests RBAC por rol/local.
- Viewports Android pequeños/tablet dentro del emulador y dispositivo físico.
- E2E: captura → entrega → ambiguo/único → orden `PAID`.
