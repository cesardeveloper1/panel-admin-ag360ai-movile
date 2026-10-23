# PRP 24: Operaciones: datos reales, conversación correcta y errores fiables

Estado: Implemented; QA nativa pendiente · Fecha: 2026-10-23 · Versión: 1.0 · Patrón B (mejora integrada de producto).
Repositorio: panel-admin-ag360ai-movile. Integración: develop.
Dependencias: PRPs 007–013 como antecedentes; primero de esta etapa.

## 1. Resumen del proyecto

Operaciones: datos reales, conversación correcta y errores fiables. Usuarios: operadores, managers y owner con alcance autorizado; delivery conserva su experiencia.
Estimación: dimensionar tras validar contratos y prototipo; sin fecha de entrega comprometida.

## 2. Problema y evidencia

OrderCard usa teléfonos de ejemplo cuando falta el real; OrderDetailSheet supone Yape. openOrderChat navega por teléfono/cliente. Los fallos pueden conservar tarjetas previas o parecer una lista vacía y el listado consulta sólo la primera página de 150 registros.
Evidencia estática de la revisión inicial; no equivale a QA visual ni a verificación de producción.
Fuentes de implementación: src/pages/OperationsPage.tsx; src/components/OrderCard.tsx; src/components/OrderDetailSheet.tsx; src/context/AppContext.tsx; src/services/orderService.ts; src/services/ordersQuery.ts; src/services/mappers/orderMapper.ts; PRPs/013--ssgg-chats-history-socket.md.

## 3. Criterios de éxito

- Fixtures con teléfono/pago ausentes no generan datos ni enlaces inventados.
- Dos conversaciones del mismo teléfono en cuentas distintas abren únicamente la vinculada; ausencia de vínculo no selecciona otra.
- Fallo inicial, fallo tras éxito, error parcial y recuperación presentan estados correctos sin datos anteriores activos.
- 151+ registros pueden recorrerse sin duplicación ni pérdida; total desconocido se distingue del total confirmado.
- Cambiar marca/local durante una petición no filtra datos de otro alcance.

## 4. Historias de usuario

Cuando atiendo un pedido, quiero confiar en sus datos, conversación y disponibilidad, para actuar sobre el cliente correcto.
Cuando cambia mi alcance o falla el servicio, quiero reconocerlo, para no actuar sobre información equivocada.

## 5. Requisitos funcionales

- P0: eliminar teléfonos y métodos de pago ficticios en producción. Ausencia = «Sin información»; sin teléfono real no hay tel: activo. Mantener mocks explícitamente aislados.
- P0: abrir la conversación mediante el identificador persistido del pedido y su cuenta/canal. No resolver silenciosamente a otro chat por teléfono; si falta vínculo, explicar la indisponibilidad.
- P0: estados explícitos de carga, éxito vacío, sin coincidencias y error. Caída general: un aviso persistente con reintento, sin tarjetas ni contadores anteriores aparentando vigencia; fallo parcial afecta sólo su región.
- P0: cancelar/ignorar respuestas de marca, local o consulta anterior; limpiar cachés al cambiar sesión y alcance.
- P0: paginación real o contrato agregado para totales. El slice visual de seis elementos no equivale a paginación. Si sólo se conoce lo cargado, etiquetarlo; nunca presentar 150 como total.
- P1: informar reconexión y última sincronización verificada sin asegurar disponibilidad sólo por tener socket conectado.

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

Auditar payload real de órdenes/contactos: ID canónico, vínculo de conversación/cuenta, teléfono opcional, pago opcional, cursor/página y total. No inventar nombres de campos o endpoints. Registrar brechas de API antes de ampliar backend.
Datos de prueba sintéticos; no ejecutar mutaciones ni carga de pruebas en producción.

## 9. UX e interacción

Aplicar jerarquía sobria del panel: superficies claras/neutras, violeta como acento, color semántico sólo para estado/alerta, espaciado consistente y tipografía legible. No trasladar cuatro columnas de escritorio al teléfono.
Recorrido: abrir contexto autorizado → identificar necesidad → actuar o consultar detalle → recibir resultado → volver conservando posición.
Los criterios de la sección 3 son el checklist visual y funcional de entrega.

## 10. Riesgos y supuestos

La API puede no exponer vínculo o total. Mantener fallback seguro y documentar el bloqueo de la capacidad concreta; no sustituirlo con heurísticas.
Este PRP amplía la etapa 005/006 sin reescribir su historial. Sus cambios explícitos prevalecen sólo en el área afectada al implementarse.

## 11. Fuera de alcance

Rediseño completo de chat, conciliación financiera, cambios en IA o navegación.
La creación del documento no autoriza ejecutar este PRP, publicar, fusionar ni desplegar.

## 12. Preguntas abiertas

Ingeniería: confirmar contrato de vínculo y paginación antes del mapper. Producto: validar copy de indisponibilidad al revisar la entrega. No bloquean eliminar datos ficticios.
Registrar respuesta y responsable antes de la tarea dependiente; avanzar las tareas independientes sin bloquear todo el PRP.



## Registro de ejecución — 2026-10-23

Implementado en `feat/mobile-ops-data-reliability`, creada desde `develop`. Commit solicitado por el usuario al iniciar el PRP 025; sin push ni despliegue.

### Cambios realizados

- Se eliminan teléfonos de ejemplo, pago Yape supuesto y etiqueta de local central inventada. Datos ausentes se presentan como Sin información; no existe enlace de llamada sin teléfono real.
- El mapper conserva agentStateId, channelAccountId y channel recibidos del backend. La orden navega por agentStateId exclusivamente. En Chats, un deep link canónico no cae a coincidencias por teléfono/nombre.
- Error persistente con reintento por región; al fallar se retiran tarjetas/contadores de esa región y el detalle de orden afectado. La marca seleccionada se conserva ante fallo inicial para permitir reintento.
- Solicitudes de órdenes tienen generación por consulta; selección de marca tiene generación independiente. Contactos usa identidad de sesión/marca/local/búsqueda, sin caché reutilizada entre alcances.
- Páginas reales con carga explícita, deduplicación por ID y detección de páginas sin progreso. Contadores se etiquetan como elementos cargados, no totales globales. Las respuestas inválidas no se convierten en listas vacías.
- Hora de última lectura exitosa; online y reconexión de socket revalidan datos. Estar conectado al socket no se presenta como sincronización confirmada.

### Contratos verificados en el checkout ssgg

`src/modules/orderfood/order-food.service.ts`, `findAllRecords`: listado con `agentStateId`, `channelAccountId`, `channel` y `meta: { page, limit, total }`. `GET /orders` mantiene ese payload dentro de StdApiResponse. `GET /contact/list` dispone de `meta.pagination`; historial por agent-state cuenta con endpoint existente. No se cambió backend.

La paginación actual del backend es por offset, sin snapshot: deduplicar evita tarjetas repetidas pero no garantiza una instantánea estable ante inserciones concurrentes. Eventos/reconexión reinician la lectura; los contadores se mantienen explícitamente como cargados. Un contrato de snapshot/cursor sería ampliación posterior, no una garantía de esta entrega.

### Validación

- `npx vitest run --threads=false`: 22 archivos, 60 pruebas correctas. Regresiones de fallo inicial/tras éxito, recuperación, cambio de local con respuesta retrasada, logout durante petición, página 151, metadatos y conversación canónica. El smoke de App aísla restauración de sesión para no contactar API real.
- `npm run build`: correcto; avisos de bundle grande y apiMock importado estática/dinámicamente permanecen.
- Lint focalizado: sin errores; dos avisos previos de dependencias de hooks en ChatsPage.
- Navegador con fixture temporal sintética: error inicial, reintento, 150→151 pedidos y fallo tras éxito sin tarjetas/contadores. A 390px se midió ancho de documento 390 y botón Reintentar de 44px de alto. Captura de error a 360px. Fixture temporal eliminada del repositorio tras comprobarlo.
- Pendiente QA completa en tablet 768/1024, orientación, teclado/safe areas nativas y VoiceOver/TalkBack. La automatización del navegador dejó de responder durante la ampliación de la revisión; no se declara esa parte verificada.

Estado intencionalmente distinto de Completed hasta cerrar QA pendiente; implementación funcional y pruebas automatizadas listas para revisión.
