# PRP 28: Operaciones: entrada por atención y priorización verificable

Estado: Draft · Fecha: 2026-10-23 · Versión: 1.0 · Patrón B (mejora integrada de producto).
Repositorio: panel-admin-ag360ai-movile. Integración: develop.
Dependencias: 024, 025, 026 y 027; última etapa.

## 1. Resumen del proyecto

Operaciones: entrada por atención y priorización verificable. Usuarios: operadores, managers y owner con alcance autorizado; delivery conserva su experiencia.
Estimación: dimensionar tras validar contratos y prototipo; sin fecha de entrega comprometida.

## 2. Problema y evidencia

OperationsPage inicia funnel/INICIAL. La urgencia actual ordena por tipo y luego ID; esto no expresa necesariamente espera. Los contadores pueden representar sólo registros cargados.
Evidencia estática de la revisión inicial; no equivale a QA visual ni a verificación de producción.
Fuentes de implementación: src/pages/OperationsPage.tsx; src/utils/opsQueue.ts; src/utils/funnelStage.ts; src/components/ContactCard.tsx; src/components/OrderCard.tsx; src/context/OrdersSocketProvider.tsx; PRPs/005--ops-attention-queue.md.

## 3. Criterios de éxito

- Fixture con intervención humana, pedido accionable, pedido normal y programado clasifica según reglas documentadas, sin falsas urgencias.
- Empates mantienen orden estable; prioridad no depende de comparar ObjectId como sustituto de tiempo.
- Resolver una necesidad no borra otra del mismo cliente ni abre conversación incorrecta.
- Nuevos eventos no mueven el objetivo durante interacción; volver conserva contexto.
- Conteo, filtros y lista concuerdan para más de 150 registros y múltiples locales.

## 4. Historias de usuario

Cuando empieza mi turno, quiero ver qué necesita intervención y por qué, para atender primero lo importante.
Cuando cambia mi alcance o falla el servicio, quiero reconocerlo, para no actuar sobre información equivocada.

## 5. Requisitos funcionales

- P0: entrada propuesta «Requiere atención» como cola transversal; es nombre de vista, no renombrado de Humano ni de estados oficiales. Conservar vistas completas de conversaciones y órdenes; reservas mantiene acceso existente.
- P0: incluir intervención humana y acciones pendientes explícitas del contrato. No tratar todas las conversaciones iniciadas o todo pedido activo como urgente.
- P0: fila indica motivo verificable: solicita humano, acción pendiente o retraso calculable. No inventar SLA ni límites.
- P0: prioridad determinista por señal, fecha pertinente y desempate estable; distinguir hora de creación, de ingreso al estado y de programación.
- P0: sin mezclar duplicados de pedido/chat: mantener relación y acceso a ambos cuando corresponda; seleccionar entidad canónica para cada necesidad.
- P0: conteos globales sólo con contrato completo/agregado y alcance autorizado. Actualizaciones no reordenan continuamente debajo del dedo; ofrecer aviso discreto de nuevos elementos.
- P0: conservar filtros/posición al actuar y volver; éxito retira o actualiza sólo la necesidad resuelta.
- P1: elegir vista inicial por preferencia del usuario si validación demuestra que ciertos roles requieren otro foco.

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

Señales de needsHuman/intervención, estado canónico, relación pedido-conversación, timestamps semánticos, programación y alcance. Si faltan agregados/consulta transversal, documentar brecha y no calcular prioridad global con primera página.
Datos de prueba sintéticos; no ejecutar mutaciones ni carga de pruebas en producción.

## 9. UX e interacción

Aplicar jerarquía sobria del panel: superficies claras/neutras, violeta como acento, color semántico sólo para estado/alerta, espaciado consistente y tipografía legible. No trasladar cuatro columnas de escritorio al teléfono.
Recorrido: abrir contexto autorizado → identificar necesidad → actuar o consultar detalle → recibir resultado → volver conservando posición.
Los criterios de la sección 3 son el checklist visual y funcional de entrega.

## 10. Riesgos y supuestos

La cola transversal es hipótesis de diseño, no resultado de investigación. Validar con tareas de atención reales o fixtures antes de sustituir la entrada; conservar alternativa completa.
Este PRP amplía la etapa 005/006 sin reescribir su historial. Sus cambios explícitos prevalecen sólo en el área afectada al implementarse.

## 11. Fuera de alcance

Scoring con IA, nuevos estados del negocio, SLA inventados, tableros de analítica, reservas completas nuevas.
La creación del documento no autoriza ejecutar este PRP, publicar, fusionar ni desplegar.

## 12. Preguntas abiertas

Producto antes de activar default: validar reglas de atención y umbrales de retraso existentes. Ingeniería antes de consulta: confirmar contrato transversal/agregados. Hasta resolverlo, no presentar urgencia inferida como dato real.
Registrar respuesta y responsable antes de la tarea dependiente; avanzar las tareas independientes sin bloquear todo el PRP.

