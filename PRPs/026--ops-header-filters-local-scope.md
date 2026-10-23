# PRP 26: Operaciones: encabezado compacto, filtros y alcance por local

Estado: In progress · Fecha: 2026-10-23 · Versión: 1.0 · Patrón B (mejora integrada de producto).
Repositorio: panel-admin-ag360ai-movile. Integración: develop.
Dependencias: 024; integrar tarjetas de 025 sin duplicar controles.

## 1. Resumen del proyecto

Operaciones: encabezado compacto, filtros y alcance por local. Usuarios: operadores, managers y owner con alcance autorizado; delivery conserva su experiencia.
Estimación: dimensionar tras validar contratos y prototipo; sin fecha de entrega comprometida.

## 2. Problema y evidencia

La vista apila selector, fecha, búsqueda, contadores, barra proporcional y subestados. El calendario sólo ofrece hoy/rango y la página no presenta un selector de local/canal equivalente al panel.
Evidencia estática de la revisión inicial; no equivale a QA visual ni a verificación de producción.
Fuentes de implementación: src/pages/OperationsPage.tsx; src/components/AppHeader.tsx; src/services/ordersQuery.ts; src/context/AppContext.tsx; src/components/HeaderStatusMenu.tsx; src/theme/agiliza.css. Referencia: ../panel-admin-ag360ai/src/pages/Operaciones/components/OperationsExtraTools.tsx y BotActivationControls.tsx; skill agiliza-panel-design.

## 3. Criterios de éxito

- A 360px hay contexto legible y acceso a filtros sin desbordamiento horizontal de página.
- Matriz owner, manager de uno/dos locales y delivery conserva permisos y contexto correcto.
- Todas las fechas no envía límites ocultos; últimas 12h no se mezcla con rango. Día/rango soportan límites y zona horaria acordados.
- Conexiones compartidas/locales no se confunden; Carta digital filtra realmente.
- Cada herramienta tiene un único acceso lógico y no hay menús vacíos.

## 4. Historias de usuario

Cuando manejo uno o varios locales, quiero saber qué estoy viendo y filtrar sin perder espacio para atender.
Cuando cambia mi alcance o falla el servicio, quiero reconocerlo, para no actuar sobre información equivocada.

## 5. Requisitos funcionales

- P0: encabezado compacto con título/contexto, búsqueda y acceso a filtros; conservar cola vertical. Retirar barra proporcional que repite los contadores.
- P0: hoja inferior de filtros con estado aplicado visible, limpiar y aplicar; separar borrador de selección aplicada. Una ubicación por control.
- P0: fecha con Todas las fechas, Hoy, Últimas 12 horas, Día y Rango; día no debe llamarse «Hoy» cuando se elige otra fecha. No imponer máximo hoy si excluye programados válidos.
- P0: un local autorizado = contexto identificado sin selector redundante; varios = selector de locales autorizados y conjunto permitido. Sin locales disponibles = icono tachado y sin popup vacío, distinguiendo carga/error.
- P0: canales reales, incluida Carta digital. Sólo WhatsApp puede tener números por local; listar cada conexión real con número/local/estado, sin inferir número receptor desde el local de entrega.
- P0: herramientas en Accesos rápidos, con fijación consistente; sólo Tutorial puede quedar aparte. Mensajes rápidos es acción, no vista rival ni duplicado en sidebar. No duplicar notificaciones.
- P0: IA muestra alcance real marca/canal/cuenta/conversación; manager parcial no obtiene apagado global de números ajenos. Omitir funciones sin contrato/capacidad aplicable.
- P1: fecha/local/canal conservados al regresar y reiniciados de forma segura al cambiar marca.

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

Reutilizar contratos autorizados de locales, canales/cuentas y estado efectivo IA del panel. Auditar soporte actual de filtros: el móvil sólo declara today/last12Hours/range; todas las fechas requiere ampliar explícitamente mapper/contrato.
Datos de prueba sintéticos; no ejecutar mutaciones ni carga de pruebas en producción.

## 9. UX e interacción

Aplicar jerarquía sobria del panel: superficies claras/neutras, violeta como acento, color semántico sólo para estado/alerta, espaciado consistente y tipografía legible. No trasladar cuatro columnas de escritorio al teléfono.
Recorrido: abrir contexto autorizado → identificar necesidad → actuar o consultar detalle → recibir resultado → volver conservando posición.
Los criterios de la sección 3 son el checklist visual y funcional de entrega.

## 10. Riesgos y supuestos

Una selección local puede filtrar entrega pero no número receptor. Tratar ambos como dimensiones distintas. No copiar permisos ni dependencias de producción hacia source/panel.
Este PRP amplía la etapa 005/006 sin reescribir su historial. Sus cambios explícitos prevalecen sólo en el área afectada al implementarse.

## 11. Fuera de alcance

Administración nueva de conexiones, onboarding de WhatsApp, nueva sección de reservas completa; conservar enlaces existentes.
La creación del documento no autoriza ejecutar este PRP, publicar, fusionar ni desplegar.

## 12. Preguntas abiertas

Ingeniería: verificar filtros admitidos por endpoint antes de habilitarlos. Producto: herramientas fijadas iniciales se validan con prototipo; propuesta búsqueda/filtros y creación contextual, sin llenar el header.
Registrar respuesta y responsable antes de la tarea dependiente; avanzar las tareas independientes sin bloquear todo el PRP.


## Registro de ejecución · 2026-10-23

Base anterior comiteada: PRP 025 en `9d99027`, misma rama `feat/mobile-ops-data-reliability`.

Implementado en esta etapa:
- Encabezado con marca, accesos rápidos fijables (filtros, chats, alertas) y una búsqueda. Sin duplicar el menú anterior de notificaciones.
- Retirada la barra proporcional redundante.
- Hoja de filtros con borrador, cerrar sin aplicar, limpiar y aplicar. Fecha: todas/hoy/12h/día/rango; sin máximo hoy. Canal de pedidos con Carta digital (`sources=2`), WhatsApp, Instagram y Messenger.
- Consulta de `/operations/context` con invalidación por sesión/marca y rechazo de contexto de otra marca. Un local identificado, varios seleccionables, vacío/carga/error diferenciados. Aplicación bloqueada si no se verifica el alcance.
- Números WhatsApp autorizados informativos, separados explícitamente del local de entrega. No se inventa un filtro de cuenta sobre el endpoint legacy `/orders`.
- Interruptor global oculto para manager/worker/delivery, ya que el móvil aún no verifica capacidad y alcance de mutación por cuenta. No se convierte un control de marca en uno local.
- Reinicio de filtros al seleccionar marca; fechas y canal aplicados visibles en pedidos.

Contratos verificados en ssgg: `OperationsService.context`, `OperationsScopeService.resolve`, `OrderFoodService.buildMatchFromFilters`. `/orders` soporta sources/branchId/timezone/fechas, pero esta integración no proporciona filtro receptor por cuenta. El contexto no implica permisos de mutación IA.

Integración adicional:
- Mensajes rápidos integrado como acceso fijable: consulta con carga/error/reintento; envío conserva el compositor de chat existente. No agrega otra pestaña.

Limitaciones de integración:
- Controles IA omitidos en Operaciones al no contar con capacidades verificadas por cuenta en el contrato de sesión móvil. El filtrado de conversaciones por canal/cuenta requiere integrar la lectura v3 nueva; no se ofrece sobre `/contact/list` ni se simula filtrando sólo la página cargada.
- Contexto local aplicado identificado también fuera de la hoja; ausencia de locales señalada sin selector vacío.
- QA visual 360/390/768/1024, teclado/safe areas y lectores nativos. Dos intentos de conectar el navegador MCP agotaron el tiempo; no hay evidencia visual nueva y no se declara aprobado.

No marcar Completed: esta entrega es parcial. No se hizo push ni despliegue.

Validación de esta etapa: suite completa 27 archivos / 91 pruebas aprobadas; build de producción aprobado con advertencias previas de tamaño de bundle y apiMock compartido. TypeScript y lint focalizados sin errores. Nuevas pruebas: borrador sin aplicación anticipada, único local autorizado, fallo de contexto, marca ajena, todas las fechas sin límites ocultos, Carta digital y día futuro sin fin de rango residual. La suite completa volvió a pasar tras integrar accesos rápidos y contexto visible.
