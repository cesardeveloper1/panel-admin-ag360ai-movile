# PRP: Impresión automática nativa desde dispositivos móviles

> **Proyecto:** `panel-admin-ag360ai-movile`  
> **Versión:** 1.0  
> **Fecha:** 2026-08-13  
> **Estado:** Implemented (P0 Android; QA físico pendiente)  
> **Patrón:** B — integración nativa, hardware y entrega recuperable  
> **Depende de:** `ssgg/PRPs/203--durable-mobile-print-jobs.md`  
> **Contrato de referencia:** `print-bridge/PRPs/011--portable-thermal-ticket-contract.md`

## 1. Project Overview

Convertir la aplicación Capacitor en una estación de impresión para restaurantes. La app podrá registrar una impresora, ejecutar una prueba y recibir trabajos automáticos de SSGG sin depender del ejecutable de escritorio ni de `localhost`.

El MVP prioriza Android y tickets térmicos ESC/POS por red local y Bluetooth Classic. iOS compartirá el dominio y la interfaz, pero su transporte automático inicial será red local o un SDK compatible del fabricante; AirPrint será un fallback interactivo, no una promesa de impresión silenciosa universal.

Usuarios: owners, supervisores y trabajadores autorizados que mantienen una tablet o teléfono en caja/cocina. Estimación: 4–6 semanas para Android MVP con hardware real; iOS requiere una fase adicional y selección de impresoras compatibles.

## 2. Problem Statement

Los negocios que operan únicamente con un teléfono o tablet no pueden usar `print-bridge`, porque ese proceso Node/Electron depende de una computadora y de un WebSocket en loopback. Además, el socket móvil actual solo refresca pedidos y descarta `thermalPrint`; si la app pierde conexión, un evento efímero no puede recuperarse. La impresión automática necesita transporte nativo, cola persistente, deduplicación y confirmación contra SSGG.

## 3. Success Criteria

- Una estación Android configurada imprime un trabajo elegible en menos de 5 segundos p95 mientras la app está activa y conectada.
- Reiniciar la app o perder la red no pierde trabajos pendientes: se recuperan por REST.
- Eventos socket duplicados, doble tap, reintentos y reconexiones no generan tickets duplicados.
- Dos trabajos simultáneos se procesan en orden mediante una cola serial por impresora.
- La orden continúa su flujo aunque la impresora esté desconectada o falle.
- La UI distingue `pendiente`, `imprimiendo`, `impreso`, `reintentando` y `fallido` sin PII en logs.
- El build web no intenta imprimir ni simula éxito; informa que requiere el binario nativo.

## 4. User Stories (Jobs-to-be-Done)

- Cuando llega un pedido elegible, quiero que el ticket se imprima sin tocar la pantalla.
- Cuando configuro una impresora, quiero imprimir una prueba para validar transporte, ancho y corte.
- Cuando Bluetooth o la red fallan, quiero conservar y reintentar el trabajo.
- Cuando la app recibe dos veces el mismo evento, quiero un solo ticket físico.
- Cuando soporte revisa un problema, quiero estados y códigos sanitizados sin datos del cliente.

## 5. Functional Requirements

### P0 — Android MVP

- **FR-001:** Crear una abstracción TypeScript `MobilePrinter` y un plugin Capacitor nativo `ThermalPrinter`, siguiendo el patrón de `PaymentNotificationCapturePlugin`.
- **FR-002:** Exponer capacidades, descubrimiento/listado, conexión, prueba, impresión, estado y cancelación/reintento seguro.
- **FR-003:** Soportar ESC/POS por TCP/IP configurable (puerto default 9100) y Bluetooth Classic/RFCOMM en Android.
- **FR-004:** Solicitar `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` solo cuando corresponda; no pedir ubicación moderna si el escaneo no la deriva.
- **FR-005:** Guardar configuración por instalación: transporte, impresora, ancho 58/80 mm, `full|kitchen|both`, autoimpresión y copias.
- **FR-006:** Añadir pantalla de configuración con detección, conexión, prueba, diagnóstico, historial y toggle de autoimpresión.
- **FR-007:** Consumir el socket solo como señal; obtener/reconciliar el payload definitivo mediante el API autenticado de SSGG.
- **FR-008:** Al arrancar, reconectar, cambiar marca/local o volver a foreground, sincronizar pendientes usando cursor.
- **FR-009:** Reclamar un trabajo antes de imprimir y proceder solo con lease confirmado para esta estación.
- **FR-010:** Persistir una cola nativa con `jobId`, estado, intentos, `nextAttemptAt`, hash y timestamps; no usar solo React/localStorage.
- **FR-011:** Procesar serialmente por impresora y aplicar backoff acotado; errores permanentes pasan a `failed`.
- **FR-012:** Completar en SSGG solo tras éxito nativo. Si falla únicamente el ACK, conservar `printed_ack_pending` y reintentar el ACK, nunca la impresión.
- **FR-013:** Deduplicar por `jobId` y conservar metadata mínima durante la retención de SSGG.
- **FR-014:** No usar `ws://127.0.0.1:17880`, el token del bridge, CORS ni `allowMixedContent` para imprimir.
- **FR-015:** Reutilizar `ThermalPrintPayload.version === 1` y validar el contrato antes de encolar.
- **FR-016:** Superar los fixtures definidos por `print-bridge`; documentar diferencias inevitables de encoding.
- **FR-017:** En `web`, devolver `NATIVE_PRINTING_UNAVAILABLE` y mostrar un estado explicativo.

### P1 — Resiliencia y plataformas

- **FR-018:** Soportar USB OTG/USB Host Android con permiso y eventos attach/detach.
- **FR-019:** Permitir modo estación persistente Android solo por opt-in, con notificación visible y restricciones de foreground services.
- **FR-020:** Integrar push como señal de sincronización; nunca transportar el ticket completo en el push.
- **FR-021:** Reimpresión manual con confirmación y registro separado del trabajo automático.
- **FR-022:** Implementar el contrato Capacitor en Swift para ESC/POS por TCP/IP.
- **FR-023:** Permitir SDK fabricante/MFi cuando el modelo lo requiera; no anunciar Bluetooth Classic genérico en iOS.
- **FR-024:** Ofrecer AirPrint como acción manual cuando no exista transporte silencioso compatible.
- **FR-025:** En iOS sincronizar al volver de suspensión; no prometer socket permanente ni impresión con la app terminada.

## 6. Non-Functional Requirements

- Entrega al menos una vez desde SSGG con efecto idempotente por estación.
- Codificación e impresión nunca bloquean el hilo UI/WebView.
- Secretos en almacenamiento nativo seguro; payloads en almacenamiento privado y con retención mínima.
- Logs sin nombre, teléfono, dirección, notas ni ticket completo.
- Android 12+ cubierto; degradación clara sin Bluetooth/USB Host.
- Touch targets ≥44 px, safe areas, diseño mobile-first y estado no dependiente solo del color.

## 7. Technical Constraints

- Ionic React + Capacitor 8; cambios en `android/` y `ios/` se versionan.
- `OrdersSocketProvider.tsx` no debe imprimir directamente ni ser la cola durable.
- El socket SSGG actual se mantiene compatible con escritorio; móvil usa `jobId`/lease.
- `node-thermal-printer`, `Buffer`, CUPS, PowerShell y Electron no se importan al WebView.
- No introducir env por impresora/proceso; la configuración es por instalación desde UI.
- Integrar sobre `develop`.

## 8. Data Requirements

```ts
type PrinterTransport = 'tcp' | 'bluetooth-classic' | 'usb' | 'airprint' | 'vendor';

interface MobilePrinterConfig {
  enabled: boolean;
  transport: PrinterTransport;
  deviceRef: string;
  displayName: string;
  paperWidthMm: 58 | 80;
  ticketMode: 'full' | 'kitchen' | 'both';
  copies: number;
}

type LocalPrintState = 'queued' | 'claimed' | 'printing' | 'printed_ack_pending'
  | 'completed' | 'retry_wait' | 'failed';

interface LocalPrintJob {
  jobId: string;
  payloadVersion: 1;
  payloadHash: string;
  state: LocalPrintState;
  attempts: number;
  nextAttemptAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  completedAt: string | null;
}
```

No persistir el payload en logs. Tras completar se conserva solo metadata deduplicadora.

## 9. UI/UX Requirements

- Entrada `Impresión` en el hub apropiado, sin navegación duplicada.
- Estado superior: `Lista`, `Sin configurar`, `Desconectada`, `Imprimiendo` o `Requiere atención`.
- Flujo: transporte → permiso → impresora → prueba → activar automático.
- Explicar que el modo estación Android puede mostrar una notificación permanente.
- Historial compacto sin PII; `Reintentar` y `Reimprimir` son acciones distintas y la segunda confirma.
- En iOS indicar cuándo el modelo solo admite AirPrint manual.

## 10. Risks & Assumptions

| Riesgo | Mitigación |
|---|---|
| El transporte confirma bytes, no papel físico | Mostrar “enviado a impresora”; usar telemetría cuando exista. |
| App cerrada pierde socket | REST por cursor, cola durable y push/foreground P1. |
| Dos estaciones imprimen | Lease atómico SSGG y `jobId` local. |
| ACK se pierde después de imprimir | `printed_ack_pending`; no reimprimir. |
| ESC/POS varía por modelo | Matriz física, fixtures y perfiles 58/80. |
| iOS limita background/Bluetooth | TCP/vendor SDK y AirPrint manual. |

Supuesto: el negocio seleccionará una estación primaria por local para el MVP y facilitará impresoras Bluetooth y TCP para QA.

## 11. Out of Scope

- Ejecutar `print-bridge` dentro del APK o imprimir desde PWA.
- Garantizar papel/tinta/tapa/corte sin telemetría del hardware.
- Socket ilimitado en iOS suspendido.
- Múltiples estaciones especializadas por sección de cocina en MVP.
- Cambiar estados o flujo de órdenes por falla de impresión.

## 12. Open Questions

1. Modelos certificados. Responsable: Operaciones/Producto antes de QA físico.
2. Scope de estación. Recomendación: por local; fallback de marca solo para negocio de un local.
3. `both` en una impresora. Recomendación: sí, dos trabajos seriales con IDs derivados.
4. Pantalla apagada Android. Recomendación: P1 con modo estación visible y opt-in.
5. SDK iOS. Depende del hardware certificado; no elegir librería genérica sin prueba física.

## Implementation Blueprint

```yaml
MUST_READ:
  - AGENTS.md
  - src/context/OrdersSocketProvider.tsx
  - src/native/paymentNotificationCapture.ts
  - android/app/src/main/java/io/ionic/starter/paymentcapture/PaymentNotificationCapturePlugin.java
  - src/services/orderSocketBrandScope.ts
  - PRPs/020--tradingtracker-device-delivery.md
  - ../ssgg/src/websocket/interfaces/order-events.interface.ts
  - ../print-bridge/docs/contracts/thermal-print-v1.schema.json
```

Estructura orientativa:

```text
src/native/thermalPrinter.ts
src/services/mobilePrintApi.ts
src/services/mobilePrintCoordinator.ts
src/pages/PrinterSettingsPage.tsx
src/types/mobilePrinting.ts
android/app/src/main/java/.../printing/
ios/App/App/Printing/
```

Orden: contratos/API → UI y adapter falso → Android TCP → cola/claim/ACK → Bluetooth → lifecycle/socket → USB → iOS.

## Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run test.unit -- --run
npm run build
npm run android:sync
cd android && ./gradlew test assembleDebug
```

Validar: fixtures full/kitchen 58/80; evento duplicado; dos trabajos; ACK timeout; fallo TCP/Bluetooth; cambio de marca; logout; Android físico TCP y Bluetooth; iOS físico antes de certificar modelos.

## Anti-Patterns

- ❌ Imprimir dentro del callback Socket.IO.
- ❌ Marcar completado antes del envío nativo.
- ❌ Reimprimir cuando solo falló el ACK.
- ❌ Identificar por monto, número o timestamp.
- ❌ PII en logs/localStorage.
- ❌ Prometer background silencioso universal.
- ❌ Copiar dependencias Node/Electron al APK.

## Implementation Result — 2026-08-13

Implementado el P0 Android:

- plugin Capacitor `ThermalPrinter` registrado en Android, con ESC/POS por TCP 9100 y Bluetooth Classic/RFCOMM;
- permisos Bluetooth Android 12+, listado de dispositivos vinculados y ticket de prueba;
- configuración privada por instalación (local, transporte, papel, tipo de ticket, copias y activación);
- cola serial nativa e historial sanitizado: solo IDs, hashes, leases, estados, intentos y tiempos, sin payload ni PII;
- reconciliación REST con SSGG, lease antes de imprimir y `printed_ack_pending` para reintentar solo el ACK;
- socket usado exclusivamente como señal de sincronización, más recuperación en inicio, reconexión y foreground;
- pantalla `Impresión automática` dentro de Pagos, responsive y con estado explícito para navegador no compatible;
- contrato `ThermalPrintPayloadV1` validado y cubierto por pruebas unitarias.

Validación realizada: `tsc`, build Vite de producción, 3 pruebas Vitest, lint de `src`, `cap sync android` y `:app:compileDebugJavaWithJavac` exitosos. El lint global conserva un error ajeno en un asset generado bajo `android/app/build`; el código fuente no presenta errores.

Pendiente P1: USB OTG, push/foreground service opt-in, reimpresión manual auditada, implementación Swift/iOS y certificación con impresoras físicas 58/80 mm. AirPrint sigue siendo fallback manual, no impresión silenciosa.
