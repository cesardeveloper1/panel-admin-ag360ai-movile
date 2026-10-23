# PRP 27: Operaciones: navegación móvil estable y accesible

Estado: Draft · Fecha: 2026-10-23 · Versión: 1.0 · Patrón B (mejora integrada de producto).
Repositorio: panel-admin-ag360ai-movile. Integración: develop.
Dependencias: 026 para estructura de controles; revisar PRPs 001–004 sin asumir 004 completado.

## 1. Resumen del proyecto

Operaciones: navegación móvil estable y accesible. Usuarios: operadores, managers y owner con alcance autorizado; delivery conserva su experiencia.
Estimación: dimensionar tras validar contratos y prototipo; sin fecha de entrega comprometida.

## 2. Problema y evidencia

AppShell desactiva BottomNav y usa hamburguesa/SideNav. Los recorridos frecuentes dependen del menú y la aplicación ya tiene particularidades de stack Ionic.
Evidencia estática de la revisión inicial; no equivale a QA visual ni a verificación de producción.
Fuentes de implementación: src/components/AppShell.tsx; src/components/BottomNav.tsx; src/components/MobileSideNav.tsx; src/navigation/appRouteRegistry.ts; src/navigation/navConfig.ts; src/navigation/chatNavFrom.ts; src/hooks/useAppNavigation.ts; PRPs/004--ionic-nav-stable.md.

## 3. Criterios de éxito

- Operaciones ↔ Chats accesibles en un toque desde raíces autorizadas.
- Diez alternancias y recorridos detalle/chat/back sin overlays huérfanos ni stacks duplicados.
- Teclado no tapa composer/CTA y no produce saltos persistentes al cerrar.
- Navegación de login/logout, deep links y cambio de marca no conserva datos privados anteriores.

## 4. Historias de usuario

Cuando alterno atención y conversación, quiero volver a mi trabajo con un gesto o toque predecible, sin perder la cola.
Cuando cambia mi alcance o falla el servicio, quiero reconocerlo, para no actuar sobre información equivocada.

## 5. Requisitos funcionales

- P0: navegación inferior con Operaciones, Chats y Menú, condicionada por capacidades; menú reúne módulos secundarios existentes sin eliminar rutas.
- P0: integrar con registry y stack de Ionic; no reactivar BottomNav antiguo a ciegas ni duplicar pushTabRoot/syncTabVisibility.
- P0: ir al chat desde orden conserva origen, filtros, scroll y selección al volver; abrir Chats desde barra abre bandeja según contrato existente.
- P0: back Android, regreso iOS, enlaces directos y cambio de marca no crean pantallas fantasma ni duplicados.
- P0: safe areas, teclado y hojas modales compatibles; navegación accesible sin swipe/hover obligatorio.
- P1: tablet conserva misma información y recorrido con adaptación de navegación; no barra inferior y lateral duplicadas simultáneamente.

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

Rutas canónicas, origen de navegación y estado de vista por alcance; no persistir PII innecesaria ni historial de otra sesión.
Datos de prueba sintéticos; no ejecutar mutaciones ni carga de pruebas en producción.

## 9. UX e interacción

Aplicar jerarquía sobria del panel: superficies claras/neutras, violeta como acento, color semántico sólo para estado/alerta, espaciado consistente y tipografía legible. No trasladar cuatro columnas de escritorio al teléfono.
Recorrido: abrir contexto autorizado → identificar necesidad → actuar o consultar detalle → recibir resultado → volver conservando posición.
Los criterios de la sección 3 son el checklist visual y funcional de entrega.

## 10. Riesgos y supuestos

Reactivar chrome puede reintroducir bugs del router Ionic. Hacer primero reproducción mínima del stack existente; conservar aliases y plugin back nativo.
Este PRP amplía la etapa 005/006 sin reescribir su historial. Sus cambios explícitos prevalecen sólo en el área afectada al implementarse.

## 11. Fuera de alcance

Reescritura del router, rediseño de todos los módulos o migración tecnológica.
La creación del documento no autoriza ejecutar este PRP, publicar, fusionar ni desplegar.

## 12. Preguntas abiertas

Ingeniería: resolver hallazgos del spike 004 antes de reemplazar lógica de stack. Producto: Menú mantiene nombre accesible y módulos autorizados existentes.
Registrar respuesta y responsable antes de la tarea dependiente; avanzar las tareas independientes sin bloquear todo el PRP.

