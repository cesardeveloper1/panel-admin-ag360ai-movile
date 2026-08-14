# PRP: Vinculación y entrega confiable a TradingTracker

> **Proyecto:** panel-admin-ag360ai-movile
> **Versión:** 1.1
> **Fecha:** 2026-08-13
> **Estado:** Implemented — contratos backend disponibles; pendiente validación E2E en Android físico
> **Patrón:** B — cliente móvil financiero offline-first
> **Epic:** `018--tradingtracker-payment-capture-and-reconciliation.md`
> **Depende de:** `019--android-notification-capture.md`

## 1. Project Overview

Vincular de forma segura el APK Android con un local y entregar a TradingTracker los eventos capturados mediante cola persistente, credencial por dispositivo e idempotencia. Esta fase termina cuando TradingTracker confirma recepción; la asignación de orden pertenece a `ssgg`.

## 2. Problem Statement

Enviar desde el callback o guardar una clave global en el APK produciría pérdida de eventos, duplicados y suplantación de locales. El dispositivo debe poder operar offline, sobrevivir reinicios y rotar/revocar sus credenciales sin afectar la sesión normal de Agiliza360.

## 3. Success Criteria

- Cada dispositivo queda unido a un único local activo mediante ticket de un uso.
- No existen claves maestras o HMAC server-to-server dentro del APK.
- Un evento sobrevive cierre forzado, reinicio y falta de red.
- Repetir una entrega devuelve el mismo evento remoto.
- Logout, cambio de marca o revocación detienen nuevos envíos hasta revincular.
- La cola no pierde elementos por timeout/ACK perdido.

## 4. User Stories (Jobs-to-be-Done)

- Cuando selecciono mi local, quiero vincular este Android de forma segura, para que los pagos lleguen al negocio correcto.
- Cuando no hay internet, quiero que la app conserve y reenvíe pagos automáticamente.
- Cuando cambio el equipo, quiero revocar el anterior, para impedir capturas no autorizadas.
- Cuando soporte revisa el dispositivo, quiero mostrar estado y errores sin revelar notificaciones.

## 5. Functional Requirements

### P0 — pairing

- **FR-001:** Solicitar a `ssgg` un ticket firmado, corto y de un solo uso para `branchId` autorizado.
- **FR-002:** Canjear el ticket directamente en TradingTracker y recibir `deviceId`, token revocable, expiración/scopes y configuración de proveedor.
- **FR-003:** Generar identidad de instalación respaldada por Android Keystore.
- **FR-004:** Guardar token mediante Secure Storage nativo y excluirlo de backups.
- **FR-005:** Mostrar local vinculado y exigir confirmación para desvincular/cambiar.
- **FR-006:** Revocar token en tracker cuando sea posible; si no hay red, borrar solo después de registrar intención segura y bloquear captura/envío.

### P0 — normalización y cola

- **FR-007:** Adaptar envelope Yape a `CapturedPaymentEventV1` sin incluir `branchId` autoritativo.
- **FR-008:** Representar dinero como `amountMinor` entero y moneda ISO.
- **FR-009:** Conservar `postTime/occurredAt`; no sustituirlo por hora de reintento.
- **FR-010:** Generar `providerEventId`/`Idempotency-Key` estable independiente de cada intento.
- **FR-011:** Estados locales: `pending`, `sending`, `retry`, `sent`, `dead_letter`.
- **FR-012:** Aplicar lease para que UI, foreground y WorkManager no envíen el mismo elemento simultáneamente.
- **FR-013:** No borrar payload hasta ACK terminal; conservar evidencia mínima después.

### P0 — transporte

- **FR-014:** Cliente TradingTracker separado del cliente `ssgg`, con URL configurable y sin credenciales públicas embebidas.
- **FR-015:** Autorizar con token de dispositivo y enviar `Idempotency-Key`.
- **FR-016:** Timeouts explícitos; 2xx/duplicado idempotente terminal, 401/403 bloquea dispositivo, 429/5xx/red reintenta.
- **FR-017:** Backoff exponencial con jitter y máximo configurable.
- **FR-018:** Usar WorkManager con restricciones de conectividad y recuperación de elementos `sending` cuyo lease expiró.
- **FR-019:** Actualizar último ACK y contadores visibles sin exponer payload.
- **FR-020:** Permitir reintento manual de `dead_letter` sin crear otro identificador lógico.
- **FR-021:** Un cambio de preferencia de proveedor solo afecta nuevas capturas; los registros `pending/sending/retry` existentes conservan su política de entrega.
- **FR-022:** Exponer una proyección local sanitizada de los estados de entrega para diagnóstico operativo.

### P1

- **FR-023:** Rotación silenciosa del token mediante refresh ligado al dispositivo.
- **FR-024:** Envío por lotes preservando ACK individual.

## 6. Non-Functional Requirements

- Entrega at-least-once e idempotencia end-to-end.
- Primer intento <5 s después de captura con red disponible.
- Reintentos eficientes sin servicio foreground permanente.
- TLS obligatorio; pinning solo con estrategia de rotación aprobada.
- Payload y token cifrados en reposo.
- Logs sin PII ni secretos.

## 7. Technical Constraints

- Android/Capacitor exclusivo.
- WorkManager para recuperación; no depender de timers JavaScript en background.
- El WebView puede solicitar acciones y mostrar estado, pero el worker/cola son nativos.
- `VITE_TRADING_TRACKER_BASE_URL` puede contener URL, nunca token.
- `ssgg` autentica al usuario y emite ticket; TradingTracker autentica al dispositivo.

## 8. Data Requirements

```ts
interface DeliveryRecord {
  localEventId: string;
  providerEventId: string;
  state: 'pending' | 'sending' | 'retry' | 'sent' | 'dead_letter';
  attempts: number;
  nextAttemptAt?: string;
  leaseUntil?: string;
  trackerEventId?: string;
  lastErrorCode?: string;
}

interface DeliveryLogView {
  localEventId: string;
  provider: 'yape' | 'plin';
  state: DeliveryRecord['state'];
  capturedAt: string;
  sentAt: string | null;
  attempts: number;
  lastErrorCode: string | null;
  duplicate: boolean;
}
```

La respuesta remota debe distinguir `created` de `duplicate` y devolver siempre el mismo `trackerEventId` para el mismo evento.

## 9. UI/UX Requirements

- Estado de vínculo, última sincronización, pendientes y errores.
- Pairing guiado sin campos de API key.
- Error 401/403 muestra “Dispositivo desvinculado” y detiene reintentos inútiles.
- Offline es estado informativo, no error destructivo.
- Acción reintentar afecta solo elementos fallidos y confirma resultado.
- Actividad reciente ordenada de más nueva a más antigua, sin equiparar `sent` con pago confirmado.
- Los logs locales nunca muestran monto, pagador ni texto; “Entregado al tracker” describe solo el ACK de transporte.

## 10. Risks & Assumptions

- **ACK perdido:** mismo idempotency key.
- **Dos workers:** lease transaccional local.
- **Token extraído:** Keystore, scopes mínimos y revocación.
- **Reloj incorrecto:** tracker registra recepción; `ssgg` aplica skew y conserva hora reportada.
- **Múltiples dispositivos para una cuenta:** tracker debe deduplicar globalmente cuando exista código de operación/huella común.

## 11. Out of Scope

- Matching o confirmación de orden.
- Mostrar candidatos.
- Cualquier plataforma distinta de Android.
- Secrets HMAC entre tracker y `ssgg`.
- Actualizar directamente MongoDB de `ssgg`.

## 12. Open Questions

- ¿Token opaco o JWT de dispositivo? Recomendación: opaco rotatable almacenado hasheado en tracker.
- ¿Una cuenta Yape admite más de un capturador activo? Recomendación MVP: uno principal por cuenta/local.
- ¿Máximo de intentos antes de dead letter? Responsable: Infra/Operaciones.
- ¿Parser definitivo móvil o tracker? Recomendación: móvil extrae mínimo; tracker valida/normaliza.

## Implementation Blueprint

1. Contratos pairing/ingest con fixtures.
2. Identidad Keystore y Secure Storage.
3. Cola/lease y adaptador Yape.
4. Cliente tracker y clasificación de respuestas.
5. WorkManager/backoff.
6. UI de estado/reintento/revocación.
7. Pruebas de caos de red y reinicio.

## 13. Implementation Result (2026-08-13)

### Implementado en Android

- Identidad de instalación con UUID persistente y par EC P-256 no exportable en Android Keystore.
- Canje nativo de ticket; el token del dispositivo nunca se devuelve al WebView y se cifra con AES/GCM antes de persistirlo.
- URL de TradingTracker configurable con `VITE_TRADING_TRACKER_BASE_URL`; HTTPS obligatorio fuera de localhost/emulador.
- Cola compatible con los envelopes del PRP 019 y estados `pending`, `sending`, `retry`, `sent`, `dead_letter`.
- Lease persistente recuperable para impedir doble envío concurrente.
- Adaptador mínimo Yape a `amountMinor`, `currency=PEN`, `occurredAt`, `postTime` y `rawPayloadHash`.
- `providerEventId` e `Idempotency-Key` estables entre reintentos.
- WorkManager con conectividad obligatoria, timeouts, backoff exponencial con jitter y máximo de ocho intentos.
- Clasificación: 2xx/409 terminal; 401/403 bloquea; 400/404/422 va a revisión; 429/5xx/red reintenta.
- El payload cifrado se elimina después del ACK, conservando evidencia mínima.
- Desvinculación offline-first: bloquea captura y reintenta revocación; pendientes del local anterior quedan en cuarentena.
- Logout y cambio de marca solicitan desvinculación automática.
- Pantalla de local, vínculo, permiso, listener, pendientes, fallidos, último ACK, reintento y revocación.

### Contrato cliente fijado

- `POST {SSGG_API}/payment-capture/pairing-tickets` con `{ branchId }`.
- `POST {TRACKER}/api/device-pairings/exchange` con ticket, installationId, clave pública y plataforma.
- `POST {TRACKER}/api/payment-events/v1` con bearer de dispositivo e `Idempotency-Key`.
- `POST {TRACKER}/api/devices/self/revoke` con bearer de dispositivo.

Los cuatro endpoints están implementados entre `ssgg` y `tradingtracker-back`. Los PRPs `ssgg/PRPs/202--payment-reconciliation-tradingtracker.md` y `tradingtracker-back/PRPs/001--payment-events-ssgg-delivery.md` conservan el contrato y sus validaciones de backend.

### Validación ejecutada

- `npx tsc --noEmit`: OK.
- ESLint: 0 errores; permanece 1 warning preexistente de Fast Refresh en `AppContext.tsx`.
- `npm run build`: OK.
- `npx cap sync android`: OK.
- `gradlew testDebugUnitTest`: OK.
- `gradlew assembleDebug`: OK.
- Pruebas JVM de parser, HTTP/backoff, URL TLS, allowlist, hash e identidad estable.
- APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`.

### Pendiente para cerrar el E2E

- Ejecutar contract tests cruzados móvil → tracker → SSGG en el entorno integrado.
- Validar desde el APK ticket expirado/reutilizado y ACK idempotente contra los endpoints reales.
- Red intermitente, reinicio y cierre forzado sobre Android físico.
- Confirmar fixtures reales anonimizados de Yape.

### Observabilidad local añadida (2026-08-13)

- La cola conserva evidencia terminal mínima y ahora incluye el proveedor normalizado.
- El plugin devuelve hasta 50 transiciones recientes sin descifrar payloads.
- La pantalla distingue pendiente, enviando, reintentando, entregado y requiere revisión.
- Los eventos capturados antes de apagar un proveedor continúan hasta ACK o `dead_letter`.
- La validación JVM/Gradle confirma compatibilidad del listener y la entrega existente.

## Validation Loop

- Ticket expirado, reutilizado, local no autorizado y revocación.
- 100 entregas concurrentes del mismo evento → un ID remoto.
- Offline, timeout, 429, 500, ACK perdido y proceso terminado.
- Reinicio con estado `sending` y lease vencido.
- Inspección del APK para ausencia de claves maestras.
- Gradle tests/build y E2E Android → tracker.
