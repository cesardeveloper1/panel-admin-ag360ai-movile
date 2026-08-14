# PRP Epic: Captura Android y conexión con TradingTracker

> **Proyecto:** panel-admin-ag360ai-movile
> **Versión:** 1.1
> **Fecha:** 2026-08-12
> **Estado:** Draft
> **Patrón:** B — integración móvil nativa y distribuida
> **Alcance de plataforma:** Android/Capacitor exclusivamente
> **PRP hijos:** `019--android-notification-capture.md`, `020--tradingtracker-device-delivery.md`, `021--payment-reconciliation-operations.md`
> **Dependencias externas:** `tradingtracker-back/PRPs/001--payment-events-ssgg-delivery.md` y `ssgg/PRPs/202--payment-reconciliation-tradingtracker.md`

## 1. Project Overview

Convertir `panel-admin-ag360ai-movile` en la aplicación Android Agiliza360 que registra el dispositivo del local, captura eventos de Yape y los entrega directamente a TradingTracker. TradingTracker normaliza y reenvía los eventos a `ssgg`, que decide la coincidencia con órdenes y persiste el resultado.

La app continuará conectada a `ssgg` para autenticación, órdenes y resultados analizados. No decidirá localmente qué orden corresponde a un pago.

```text
Android/Capacitor (captura Yape) → TradingTracker → SSGG (matching/confirmación)
              ↘ estado y cola local       ↓
                     App Android ← resultado analizado/socket de SSGG
```

La interfaz React se ejecuta como contenido embebido del APK mediante Capacitor. Android es la única plataforma de producto considerada.

## 2. Problem Statement

La app Android está construida con Ionic React y Capacitor, pero actualmente no incluye un `NotificationListenerService`, plugin Capacitor ni cliente de TradingTracker. Sin estas piezas, el APK no puede cumplir su función central de capturador de pagos.

Sin registro seguro del dispositivo, persistencia offline e idempotencia, una notificación puede perderse, enviarse dos veces o asociarse a un local incorrecto. Además, colocar secretos server-to-server dentro del APK permitiría extraerlos.

## 3. Success Criteria

- Android detecta únicamente notificaciones de proveedores habilitados y las entrega una sola vez lógicamente a TradingTracker.
- El dispositivo queda vinculado a un local mediante credencial revocable, sin guardar API keys maestras en el APK.
- Si la app o la red no están disponibles, los eventos quedan en cola cifrada y se reintentan.
- La captura continúa con la UI cerrada después de que el usuario otorgue acceso, respetando restricciones de Android.
- La app nunca asigna órdenes ni marca pagos; muestra el resultado proveniente de `ssgg`.
- El flujo completo se valida en APK Android y dispositivo físico.
- Un logout no reasigna silenciosamente el dispositivo a otra marca/local.

## 4. User Stories (Jobs-to-be-Done)

- Cuando instalo Agiliza360 en el Android que recibe Yape, quiero activar el acceso a notificaciones, para validar pagos automáticamente.
- Cuando cambio de local, quiero vincular el dispositivo de forma explícita, para no mezclar ingresos.
- Cuando pierdo internet, quiero que los pagos se envíen después, para no perder validaciones.
- Cuando hay una coincidencia ambigua, quiero verla como pendiente de revisión, no como pago confirmado.
- Cuando reviso la operación desde la misma app Android, quiero ver el estado del capturador y los pagos ya analizados.

## 5. Functional Requirements

### P0 — vinculación y credenciales

- **FR-001:** Obtener desde `ssgg` un ticket de emparejamiento corto asociado al usuario y `branchId` seleccionado.
- **FR-002:** Intercambiar el ticket directamente con TradingTracker por una credencial de dispositivo de alcance mínimo.
- **FR-003:** Guardar credencial y `deviceId` mediante almacenamiento seguro nativo; nunca en localStorage.
- **FR-004:** El ticket será de un solo uso y expirará; la credencial podrá revocarse desde la app o servidor.
- **FR-005:** No incluir `MASTER_API_KEY`, secreto HMAC o clave de servicio en variables `VITE_*`, JavaScript o APK.
- **FR-006:** Mostrar vínculo actual, local, proveedor, última sincronización y estado de permisos.

### P0 — captura Android

- **FR-007:** Implementar plugin Capacitor propio con `NotificationListenerService` Android.
- **FR-008:** Declarar el servicio con `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` y abrir la pantalla oficial de acceso a notificaciones; no intentar conceder permisos automáticamente.
- **FR-009:** Filtrar por package allowlist versionada (`Yape` inicialmente); bloquear correo, WhatsApp y otras fuentes.
- **FR-010:** Extraer package, título, cuerpo, `postTime` y clave de notificación y pasar el evento al adaptador Yape.
- **FR-011:** Parsear monto, pagador y código de operación cuando exista; ante formato desconocido, no inventar valores y registrar estado local seguro.
- **FR-012:** Crear `providerEventId/dedupeKey` estable usando proveedor, dispositivo, `postTime`/clave y hash normalizado.
- **FR-013:** Guardar una cola local cifrada con estados `pending`, `sending`, `sent`, `retry`, `failed`.
- **FR-014:** Reintentar con backoff y jitter usando un mecanismo compatible con restricciones de background de Android (WorkManager recomendado).
- **FR-015:** Enviar directamente a TradingTracker con credencial de dispositivo y `Idempotency-Key`.
- **FR-016:** Considerar 2xx y respuesta duplicada idempotente como éxito; no borrar antes del ACK.
- **FR-017:** No incluir `branchId` como autoridad libre en cada evento; TradingTracker debe derivarlo del vínculo del dispositivo.

### P0 — resultados y operación

- **FR-018:** Consultar resultados analizados desde `ssgg`, no desde el endpoint crudo de TradingTracker.
- **FR-019:** Mostrar estados: Detectado, Enviado, Analizando, Revisión necesaria, Confirmado, Sin coincidencia y Error.
- **FR-020:** Escuchar socket de `ssgg` para actualizar conciliaciones/órdenes y reconciliar con REST al reconectar.
- **FR-021:** Permitir confirmación/rechazo manual solo si `ssgg` autoriza el rol; nunca decidir el candidato en el cliente.
- **FR-022:** Proteger acciones repetidas: estado en vuelo por transacción, ACK obligatorio y refresco tras 409.
- **FR-023:** Separar “evento capturado” de “pago confirmado” en toda la UI.

### P0 — ejecución Android

- **FR-024:** Habilitar captura, cola, diagnóstico y revisión exclusivamente dentro del APK Android.
- **FR-025:** Tratar la disponibilidad del bridge nativo como requisito de ejecución; un fallo del plugin debe mostrar diagnóstico y bloquear la captura.
- **FR-026:** La navegación y servicios relacionados con TradingTracker podrán asumir entorno Capacitor Android después de validar el bridge.
- **FR-027:** Los comandos de validación relevantes serán build de assets, `cap sync android`, Gradle y pruebas en Android.

### P1

- **FR-028:** Añadir Plin mediante una entrada de allowlist/parser, manteniendo el mismo contrato.
- **FR-029:** Diagnóstico exportable sin payload personal: permiso, última captura, cola y último error.
- **FR-030:** Activación `shadow`, `manual`, `automatic` por local según estado enviado por `ssgg`.
- **FR-031:** Recuperar vínculo tras reinstalación mediante nuevo pairing; no restaurar credenciales desde backup inseguro.

## 6. Non-Functional Requirements

- **Seguridad:** TLS, almacenamiento seguro, credencial por dispositivo/local y pinning solo si existe estrategia de rotación viable.
- **Privacidad:** capturar únicamente allowlist; no registrar cuerpos de otras aplicaciones; redactar logs.
- **Confiabilidad:** entrega at-least-once con idempotencia; persistencia antes de red.
- **Batería:** envío inmediato cuando sea posible y WorkManager para recuperación, sin polling continuo.
- **Rendimiento:** listener no hará red ni parsing pesado en el callback; encolará y retornará.
- **Accesibilidad:** estados y errores con texto, no solo color; touch targets ≥44 px.

## 7. Technical Constraints

- Ionic React, TypeScript, Capacitor 8 y Android nativo Java/Kotlin.
- La captura no puede implementarse solo con JavaScript.
- La capa React se usa exclusivamente dentro del WebView de Capacitor Android para este epic.
- El cliente de TradingTracker debe estar separado del `api` de `ssgg`, pero su URL pública puede ser configurable (`VITE_TRADING_TRACKER_BASE_URL`); ninguna credencial estará en env pública.
- La autenticación regular y el resultado de conciliación permanecen en `ssgg`.

## 8. Data Requirements

Evento local/salida hacia tracker:

```ts
interface CapturedPaymentEventV1 {
  schemaVersion: 1;
  providerEventId: string;
  source: 'yape';
  amountMinor: number;
  currency: 'PEN';
  payerDisplayName?: string;
  operationCode?: string;
  occurredAt: string;
  postTime?: number;
  rawPayloadHash: string;
}
```

La cola puede conservar temporalmente el texto mínimo necesario para reparse/reenvío, cifrado y con TTL. Después del ACK debe retener solo identificadores/estado según política.

## 9. UI/UX Requirements

- Sección “Validación automática de pagos” dentro de configuración del local.
- Checklist Android: dispositivo vinculado, acceso a notificaciones, Yape detectado y conexión operativa.
- Botón que abre ajustes oficiales y revalida al volver a foreground.
- Estado persistente y calmado; no mostrar loader permanente por falta de eventos.
- Bandeja móvil compacta para elementos por revisar y confirmados.
- Empty state con ícono y texto breve, coherente con el dashboard.

## 10. Risks & Assumptions

- **OEM mata procesos:** WorkManager y prueba en fabricantes comunes; aun así Android no garantiza ejecución instantánea.
- **Texto de Yape cambia:** parsers versionados y fixtures anonimizados.
- **Captura de datos ajenos:** allowlist estricta antes de persistir.
- **Dispositivo compartido:** vínculo visible y revocación; cambio de local explícito.
- **Evento tardío/offline:** conservar `occurredAt`; `ssgg` decide si sigue dentro de ventana.
- **Fragmentación Android:** comportamiento en background varía por fabricante; validar matriz de dispositivos y documentar ajustes de batería.

## 11. Out of Scope

- Cualquier plataforma distinta de Android.
- Confirmar pagos directamente contra bancos.
- Asignar una orden dentro del parser móvil.
- Guardar secretos server-to-server en la app.
- Pagos parciales, devoluciones o múltiples pagos por orden.

## 12. Open Questions

- ¿La app actual reemplaza al capturador Android anterior o convivirán temporalmente? Responsable: Producto/Mobile.
- ¿Qué versiones mínimas de Android y fabricantes se soportarán? Responsable: Mobile/QA.
- ¿El parser vive en móvil o tracker? Recomendación: extracción básica móvil y normalización/validación definitiva en tracker.
- ¿Cuánto tiempo puede retenerse texto crudo cifrado? Responsable: Seguridad/Legal.
- ¿La revisión manual se incluye en móvil MVP o solo se muestra estado? Responsable: Producto.

## Implementation Blueprint

1. Contrato compartido y cliente TradingTracker sin secretos embebidos.
2. Pairing `ssgg → ticket → tracker → device credential`.
3. Plugin Android `NotificationListenerService` y contrato del bridge Capacitor.
4. Parser Yape, dedupe y cola cifrada.
5. WorkManager y entrega idempotente.
6. Pantalla de configuración/diagnóstico.
7. Resultados analizados desde `ssgg` y socket.
8. Shadow mode y pruebas en dispositivos reales antes de auto-confirmación.

## Validation Loop

- Unit tests TypeScript y nativos del parser/dedupe.
- Tests de cola: cierre forzado, reinicio, offline y ACK perdido.
- Tests de pairing expirado/reutilizado/revocado.
- Tests Android con permiso concedido/revocado y fuentes bloqueadas.
- Build de assets, `npx cap sync android` y Gradle del APK.
- E2E: notificación Yape → tracker → ssgg → orden/estado móvil.
- Validación manual en Android físico; el emulador no reproduce fielmente Yape/OEM background.
