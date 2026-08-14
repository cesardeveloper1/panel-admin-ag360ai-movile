# PRP: Captura nativa de notificaciones de pago en Android

> **Proyecto:** panel-admin-ag360ai-movile
> **Versión:** 1.1
> **Fecha:** 2026-08-13
> **Estado:** Implemented — pendiente validación en dispositivo con una notificación real de Yape
> **Patrón:** B — plugin nativo Android
> **Epic:** `018--tradingtracker-payment-capture-and-reconciliation.md`

## 1. Project Overview

Implementar la capacidad nativa Android que permite al APK Agiliza360 recibir notificaciones publicadas por Yape, filtrar su origen y persistir un evento local antes de cualquier comunicación de red. Esta fase no conecta todavía con TradingTracker ni confirma pagos.

## 2. Problem Statement

El proyecto solo contiene una `MainActivity` estándar y no declara un `NotificationListenerService`. La capa React no puede acceder por sí sola a notificaciones de otras aplicaciones. Sin una frontera nativa pequeña, testeable y restrictiva, existe riesgo de capturar información de aplicaciones ajenas o bloquear el hilo principal.

## 3. Success Criteria

- El usuario puede abrir Ajustes de acceso a notificaciones y la app detecta si el permiso está concedido.
- Solo el package oficial configurado de Yape genera eventos.
- El callback nativo persiste el evento y retorna sin red ni procesamiento pesado.
- Reiniciar la app/teléfono no elimina eventos pendientes.
- Revocar el permiso se refleja al volver a foreground.
- Notificaciones de correo, WhatsApp y otras apps nunca se persisten.
- Desactivar Yape impide nuevas capturas incluso con el listener conectado y la UI cerrada.
- La app puede mostrar actividad local reciente sin devolver payload cifrado al WebView.

## 4. User Stories (Jobs-to-be-Done)

- Cuando preparo el Android del local, quiero habilitar el permiso correcto, para que Agiliza360 detecte Yape.
- Cuando llega una notificación de otra app, quiero que sea ignorada, para proteger información privada.
- Cuando Android cierra la interfaz, quiero que la captura continúe, para no perder pagos.
- Cuando el permiso se revoca, quiero ver un diagnóstico claro, para restaurarlo.

## 5. Functional Requirements

### P0

- **FR-001:** Crear plugin Capacitor Android `PaymentNotificationCapture` con API tipada TypeScript.
- **FR-002:** Implementar `NotificationListenerService` declarado con `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` e intent filter oficial.
- **FR-003:** Exponer `getPermissionStatus()` y `openNotificationListenerSettings()`.
- **FR-004:** Revalidar permiso al evento `appStateChange`/resume.
- **FR-005:** Mantener allowlist de package IDs por proveedor, empezando por el package real de Yape verificado en dispositivo.
- **FR-006:** Ignorar antes de persistir cualquier package fuera de allowlist.
- **FR-007:** Extraer de `StatusBarNotification`: package, key, id, `postTime`, título y cuerpo textual disponible.
- **FR-008:** No guardar imágenes, intents, extras completos ni contenido de fuentes bloqueadas.
- **FR-009:** Crear envelope local con UUID, timestamps y hash; no interpretar todavía la orden.
- **FR-010:** Persistir en almacenamiento local nativo antes de notificar a JavaScript.
- **FR-011:** Exponer diagnóstico agregado: permiso, listener conectado, último evento aceptado y contador pendiente.
- **FR-012:** Manejar repost/actualizaciones de una misma notificación mediante clave estable.
- **FR-013:** No cancelar ni modificar notificaciones de Yape.
- **FR-014:** Resolver el proveedor exclusivamente desde el package exacto de allowlist.
- **FR-015:** Persistir preferencias nativas por proveedor con defaults seguros y consultarlas antes de extraer texto.
- **FR-016:** Rechazar la activación de proveedores conocidos pero aún no soportados.
- **FR-017:** Persistir el identificador normalizado del proveedor dentro del envelope local.
- **FR-018:** Proyectar logs sanitizados limitados sin devolver ciphertext ni contenido de la notificación.

### P1

- **FR-019:** Añadir allowlists y parsers fixture de Plin por aplicación bancaria validada.
- **FR-020:** Permitir exportar códigos de error nativos anonimizados para soporte.

## 6. Non-Functional Requirements

- Callback <50 ms p95 excluyendo escritura local.
- Cero operaciones HTTP en `onNotificationPosted`.
- Base local cifrada o payload cifrado con Android Keystore.
- Logs sin título/cuerpo, pagador, monto o teléfono.
- Compatibilidad con la versión mínima de Android que defina QA.
- Consumo de batería despreciable sin polling.

## 7. Technical Constraints

- Capacitor 8 y proyecto Android existente.
- Elegir Java o Kotlin consistentemente para plugin/worker; Kotlin recomendado si se introduce Room/WorkManager.
- El plugin solo requiere implementación Android.
- La definición TypeScript existe exclusivamente como contrato del bridge del WebView Android.
- No guardar credenciales en esta fase.

## 8. Data Requirements

```ts
interface CapturedNotificationEnvelope {
  localEventId: string;
  provider: 'yape' | 'plin';
  packageName: string;
  notificationKey: string;
  postTime: number;
  capturedAt: string;
  titleCiphertext: string;
  bodyCiphertext: string;
  contentHash: string;
  state: 'captured';
}
```

Definir TTL para payload crudo local. La clave criptográfica no será exportable ni incluida en backup.

## 9. UI/UX Requirements

- Pantalla de preparación con cuatro estados: Sin configurar, Permiso requerido, Escuchando y Error.
- CTA principal abre Ajustes oficiales; al regresar se actualiza automáticamente.
- Explicar de forma breve qué apps se leen y por qué.
- No pedir permisos no relacionados.
- Diagnóstico visible sin exponer texto de notificaciones.
- Controles por proveedor deben reflejar `enabled` y `supported` por separado.
- Si un proveedor no está soportado, el toggle permanece deshabilitado y explica la causa.

## 10. Risks & Assumptions

- **Package ID cambia:** configuración versionada y prueba real.
- **OEM desconecta listener:** detectar `onListenerDisconnected`, solicitar rebind y mostrar alerta persistente.
- **Payload cambia:** esta fase conserva envelope seguro; parsing se cubre después.
- **Backup restaura base sin clave:** excluir almacenamiento sensible de backup o limpiar registros ilegibles.
- **Supuesto:** Yape publica monto/pagador en texto accesible al listener.
- **Plin distribuido entre bancos:** tratar “Plin” como capacidad futura, no como un package único ni como permiso para leer toda una app bancaria.

## 11. Out of Scope

- Enviar a TradingTracker.
- Parsear monto definitivo.
- Buscar o confirmar órdenes.
- Cualquier plataforma distinta de Android.
- Leer SMS, accesibilidad o pantalla como mecanismo alternativo.

## 12. Open Questions

- ¿Android mínimo y fabricantes prioritarios? Responsable: Mobile/QA.
- ¿Room con SQLCipher o cifrado de columnas sobre SQLite? Responsable: Mobile/Security.
- ¿Cuál es el package ID exacto de Yape en producción? Responsable: QA en dispositivo.
- ¿TTL de payload local antes/después del envío? Responsable: Seguridad.

## Implementation Blueprint

1. Contrato TypeScript del plugin.
2. Servicio y manifest Android.
3. Allowlist y extracción mínima.
4. Persistencia cifrada/dedupe local.
5. Pantalla de permiso/diagnóstico.
6. Pruebas unitarias nativas y dispositivo físico.

## Validation Loop

- Unit tests de allowlist, hash y dedupe.
- Instrumentation test del bridge Capacitor.
- Prueba con permiso concedido/revocado.
- Prueba con Yape y al menos tres apps bloqueadas.
- Reinicio, cierre forzado y reconexión del listener.
- `npx cap sync android`, Gradle test/build y APK físico.

## 13. Implementation Result (2026-08-12)

- Plugin Capacitor Android `PaymentNotificationCapture` registrado en la actividad principal.
- `NotificationListenerService` declarado con el permiso de binding oficial y sin capacidad para cancelar notificaciones.
- Allowlist exacta inicial: `com.bcp.innovacxion.yapeapp`; cualquier otro package se descarta antes de extraer o persistir contenido.
- Envelope nativo con UUID, timestamps, hashes y deduplicación estable.
- Título y cuerpo cifrados con AES/GCM y una clave no exportable de Android Keystore.
- Cola persistente con exclusión mutua, escritura confirmada antes del evento JavaScript y límite defensivo de 500 pendientes.
- Backup Android deshabilitado para evitar restaurar payload cifrado sin su clave local.
- Bridge tipado con permiso, apertura de Ajustes, diagnóstico agregado y evento de nueva captura.
- Pantalla accesible desde Configuración con estados Permiso requerido, Sin configurar, Escuchando y Error; refresco al volver a foreground.
- Pruebas JVM para allowlist, normalización, hash e identidad estable.

### Validación ejecutada

- `npx tsc --noEmit`: OK.
- ESLint sobre los archivos TypeScript/React modificados: OK.
- `npm run build`: OK.
- `npx cap sync android`: OK.
- `gradlew testDebugUnitTest`: OK.
- `gradlew assembleDebug`: OK.
- Manifiesto fusionado: servicio y `BIND_NOTIFICATION_LISTENER_SERVICE` presentes.
- APK debug generado en `android/app/build/outputs/apk/debug/app-debug.apk`.

### Validación aún manual

- Conceder/revocar acceso en un teléfono Android.
- Confirmar el package ID y el payload real de una notificación de Yape instalada desde producción.
- Probar reconexión en los OEM priorizados después de reinicio y cierre forzado.

### Ampliación implementada (2026-08-13)

- Nuevo almacenamiento `PaymentProviderSettings` separado de la cola y persistente entre reinicios.
- Yape queda habilitado por defecto; Plin aparece como proveedor conocido, deshabilitado y `supported=false`.
- `NotificationListenerService` resuelve package → provider y verifica su preferencia antes de leer título/cuerpo.
- Envelopes nuevos guardan `provider`; los antiguos conservan compatibilidad mediante fallback por package.
- `getCaptureLogs(limit)` devuelve solo ID local, proveedor, timestamps, estado, intentos, duplicado y error.
- El bridge Capacitor permite consultar/actualizar fuentes y consultar los últimos 50 logs.
- Pruebas JVM ampliadas para resolución exacta package → proveedor; Gradle y TypeScript pasan.
