# PRP 25: Operaciones: tarjetas accionables y detalle seguro

Estado: Implemented; QA nativa pendiente · Fecha: 2026-10-23 · Versión: 1.0 · Patrón B (mejora integrada de producto).
Repositorio: panel-admin-ag360ai-movile. Integración: develop.
Dependencias: 024 terminado para datos fiables.

## 1. Resumen del proyecto

Operaciones: tarjetas accionables y detalle seguro. Usuarios: operadores, managers y owner con alcance autorizado; delivery conserva su experiencia.
Estimación: dimensionar tras validar contratos y prototipo; sin fecha de entrega comprometida.

## 2. Problema y evidencia

La tarjeta omite importe, modalidad e identificador. El detalle presenta «Yo / IA» como estado local y cierra al disparar advanceOrder sin esperar su resultado. La transición actual trata todos los pedidos listos como enviados en camino.
Evidencia estática de la revisión inicial; no equivale a QA visual ni a verificación de producción.
Fuentes de implementación: src/components/OrderCard.tsx; src/components/OrderDetailSheet.tsx; src/context/AppContext.tsx (advanceOrder); src/utils/orderKanban.ts; src/types/index.ts; src/theme/agiliza.css; PRPs/006--ops-order-card-urgency.md.

## 3. Criterios de éxito

- La tarjeta permite identificar pedido, importe y modalidad sin abrir detalle.
- Transiciones probadas por modalidad y capacidad; roles sin permiso no pueden mutar.
- Doble toque envía una sola mutación; rechazo/red lenta conserva sheet y permite reintento explícito.
- Acción principal accesible con teclado abierto y safe areas; no tapa el último producto.
- Ningún control IA afirma éxito sin persistencia confirmada.

## 4. Historias de usuario

Cuando veo una orden, quiero identificarla y ejecutar el siguiente paso permitido con pocos toques, conservando contexto si falla.
Cuando cambia mi alcance o falla el servicio, quiero reconocerlo, para no actuar sobre información equivocada.

## 5. Requisitos funcionales

- P0: tarjeta con estado e identificador legible, cliente e importe, modalidad y tiempo verificable; local sólo en alcance multilocal. Chat y llamada reales siguen disponibles sin competir con la acción principal.
- P0: acción principal según estado, modalidad y capacidad; reutilizar una política de transición para tarjeta y detalle. No mandar retiro/salón a «En camino» por defecto.
- P0: acción rutinaria válida desde tarjeta en un toque; detalle disponible. Cancelaciones/acciones delicadas requieren confirmación o motivo según contrato.
- P0: esperar resultado, bloquear doble toque por pedido y reconciliar con servidor. Error conserva detalle y datos; éxito no debe duplicar cambios recibidos por socket.
- P0: detalle progresivo con resumen y acción fija inferior dentro del área segura; productos, modificadores, notas, entrega y pago cuando existan.
- P0: «Yo / IA» sólo si existe operación real autorizada con estado confirmado, alcance y feedback. Si no existe contrato, retirar el control inerte sin simular una función.
- P1: conservar posición, foco y filtros al volver del detalle/chat.

## 6. Requisitos no funcionales

- Targets táctiles ≥44px, contraste y foco accesibles; sin interacción exclusiva por hover o gesto.
- Validar 360/390px y tablet 768/1024px, orientación, safe areas, teclado, VoiceOver/TalkBack y reduced motion.
- Conservar localización disponible; no hardcodear copy ni fechas a un idioma.
- No filtrar datos entre sesiones/locales; no registrar tokens, teléfonos ni mensajes en evidencias.
- Sin loaders globales innecesarios durante mutaciones locales; feedback acotado al elemento afectado.

## 7. Restricciones técnicas y plan de ejecución

- Respetar AGENTS.md: mobile-first, integración en develop; no incorporar cambios de producto directamente en main/master. Estos documentos no autorizan despliegues ni commits.
- Aplicar agiliza-panel-design y los patrones existentes de Ionic/React/Capacitor. No copiar el tablero de escritorio ni introducir otra librería visual.
- Conservar nombres oficiales de estados, rutas compatibles, traducciones existentes y experiencia propia de delivery. Añadir claves para copy nuevo.
- Verificar capacidades y alcance en servidor; ocultar controles no sustituye autorización.
- Revalidar el código con CodeGraph al ejecutar: la evidencia corresponde a la revisión del 2026-10-22, no certifica el estado futuro.

1. Revalidar fuentes y contratos citados; documentar diferencias.
2. Implementar modelo/política común antes de wiring visual; reutilizar primitivas existentes.
3. Conectar UI con resultados reales y estados de fallo.
4. Ejecutar pruebas focalizadas de los criterios anteriores; npm run build y lint sobre archivos cambiados según configuración vigente.
5. Revisar en navegador móvil; interacciones nativas necesitan evidencia en dispositivo o limitación declarada.
6. Registrar resultado, capturas sanitizadas y pendientes. No marcar Completed si faltan criterios P0; distinguir implementación de validación.

## 8. Datos y contratos

Usar identificador canónico, estado/versionado si existe, modalidad, moneda real, total, timestamps y permisos. Tiempo desconocido no se convierte en retraso; fijar zona horaria y semántica del timestamp.
Datos de prueba sintéticos; no ejecutar mutaciones ni carga de pruebas en producción.

## 9. UX e interacción

Aplicar jerarquía sobria del panel: superficies claras/neutras, violeta como acento, color semántico sólo para estado/alerta, espaciado consistente y tipografía legible. No trasladar cuatro columnas de escritorio al teléfono.
Recorrido: abrir contexto autorizado → identificar necesidad → actuar o consultar detalle → recibir resultado → volver conservando posición.
Los criterios de la sección 3 son el checklist visual y funcional de entrega.

## 10. Riesgos y supuestos

Cambios concurrentes pueden invalidar la acción. Reconciliar y presentar el estado actual sin reenviar a ciegas. No inferir capacidades desde el nombre del rol.
Este PRP amplía la etapa 005/006 sin reescribir su historial. Sus cambios explícitos prevalecen sólo en el área afectada al implementarse.

## 11. Fuera de alcance

Nueva máquina de estados del negocio, edición completa de pedido, pagos/impresión nuevos.
La creación del documento no autoriza ejecutar este PRP, publicar, fusionar ni desplegar.

## 12. Preguntas abiertas

Ingeniería/producto: verificar transiciones válidas por modalidad antes de habilitar CTA; contrato real de takeover IA antes de mostrar su control. Si falta, entregar resto con control omitido.
Registrar respuesta y responsable antes de la tarea dependiente; avanzar las tareas independientes sin bloquear todo el PRP.



## Registro de ejecución — 2026-10-23

PRP 024 comiteado como `3f9eaa6`. PRP 025 implementado en la misma rama `feat/mobile-ops-data-reliability`; comiteado posteriormente como `9d99027` por instrucción del usuario. Sin push ni despliegue.

### Implementación

- Tarjeta con estado e identificador, cliente/importe, modalidad, fecha de creación verificada y local en contexto multilocal cuando se conoce su nombre. Sin moneda supuesta: se usa currency de la marca; falta de moneda no se convierte en PEN.
- Se corrige el enum real: delivery=1, recojo=2, salón=3, programación=4. Modalidad/estado desconocidos o programados no habilitan una transición inferida. `timerOrderTime` es umbral del local y deja de interpretarse como minutos transcurridos.
- Política compartida `nextOrderAction`: aceptado a cocina; cocina a listo; listo delivery a camino; listo recojo/salón a entregado; camino delivery a entregado. Sin nuevas cancelaciones ni nuevas transiciones del backend. Cocina usa la misma política y bloqueo.
- Perfil verificado mediante `/auth/me`, rol preservado sin convertir desconocidos en owner, proyección de capacidad efectiva según contrato del panel (operaciones.view/change_status, bypass owner/superadmin). Falta de permiso deniega; el servidor sigue autorizando cada recurso. El flujo general no sustituye las acciones propias de motorizados.
- Bloqueo compartido por pedido, preflight de detalle, validación de estado/modalidad/alcance y relectura posterior. Rechazo o respuesta no confirmada mantiene el detalle y permite reintentar mediante nueva comprobación; nunca reenvía automáticamente. Resultados de otro alcance se descartan.
- Reconciliación por updatedAt y secuencia para no sobrescribir confirmaciones con respuestas de refresh iniciadas antes; refresh en segundo plano no introduce un loader global durante una mutación local. Un fallo de carga sigue retirando datos como en 024.
- Detalle mediante GET /orders/:id, con productos reales, modificadores, notas, dirección y pago soportado cuando existen. Se elimina el producto Consumo ficticio. El resolver de ID también utiliza el GET autorizado de órdenes, evitando el endpoint de orquestación que puede reparsar/persistir productos.
- Se retira Yo/IA porque no estaba conectado a una operación real. El detalle carga y falla por separado; footer fuera del scroll, acción de 48px y safe-area. Cierra sólo tras confirmación y devuelve foco sin desplazar la cola.

### Contratos y límites comprobados

Fuentes: `ssgg/src/modules/orderfood/order-food.controller.ts` (GET detalle y PUT estado), `order-food.service.ts` (findDetail), `entity/order-food.entity.ts` (deliveryInfo/content), `payment/order-food-payment.catalog.ts`; y `panel-admin-ag360ai/src/lib/panelCapabilities.ts` para proyección de permisos. Se reusan endpoints existentes; no hay cambios de backend ni llamadas de prueba a producción.

El PUT actual no acepta expectedStatus/version para comparar y escribir atómicamente. El preflight detecta conflictos observados y la relectura confirma resultados, pero otro operador aún puede escribir entre ambas llamadas. Cerrar esa ventana exige un contrato CAS del servidor: no se declara exclusión mutua entre dispositivos.

Los nombres de sucursal sólo se muestran si vienen del contrato/metadata de marca; no se inventan desde el lugar de entrega. Los métodos de pago del modelo móvil actual (efectivo/tarjeta/Yape/Plin) se mapean por enum; otros catálogos regionales necesitan ampliación de etiquetas, sin fingir un método conocido.

### Validación

- `npx vitest run --threads=false`: 26 archivos, 86 pruebas correctas, incluyendo reglas por modalidad/capacidad, denegación, doble toque, rechazo, conflicto, refresh que llega tarde, detalle abierto ante fallo y cierre tras confirmar.
- Build correcto y lint focalizado sin errores; permanecen avisos de tamaño de bundle y mezcla de importación estática/dinámica de apiMock.
- Navegador con fixture sintética en origen separado, sólo loopback: 360x800 CSS px y tablet 768x1024. A 360px, CTA de 48px con borde inferior 788 dentro de viewport de 800; último producto y notas accesibles por encima del footer. Tablet: CTA termina en 1012 dentro de 1024. El zoom del navegador se compensó y se midieron innerWidth/innerHeight reales.
- Rechazo simulado mantiene modal y error; reintento confirmado lo cierra y actualiza de 1 nuevo/1 en proceso a 0 nuevos/2 en proceso. Capturas sanitizadas guardadas fuera del repositorio. Fixtures temporales retiradas al terminar QA.
- Pendiente QA de 390/1024 de ancho, orientación completa, teclado/safe-area en dispositivo y VoiceOver/TalkBack. La automatización dejó de responder durante la ampliación final; no se declara esa parte verificada. Retorno desde chat se conserva con la navegación existente y requiere el recorrido nativo de PRP 027.

Se mantiene Implemented, no Completed, hasta resolver QA pendiente. La ampliación CAS requiere trabajo de contrato independiente si se necesita garantía de concurrencia atómica.
