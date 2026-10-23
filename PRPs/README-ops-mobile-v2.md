# Operaciones móvil — segunda etapa

Estado: PRP 024 comiteado; 025 comiteado con QA pendiente; 026 comiteado con pendientes; 027 implementado con QA pendiente; 028 en planificación. Fecha: 2026-10-23.

Objetivo: detectar qué requiere atención, actuar y volver a la cola con contexto. Se conserva la identidad del panel y se adapta el recorrido al teléfono.

## Orden de ejecución

| Orden | PRP | Estado | Resultado |
|---|---|---|---|
| 1 | [024 — Datos fiables](024--ops-data-reliability.md) | Implemented; QA pendiente | Datos reales, conversación vinculada, errores y paginación |
| 2 | [025 — Tarjetas y detalle](025--ops-actionable-order-detail.md) | Implemented; QA pendiente | Próxima acción válida y resultado confirmado |
| 3 | [026 — Encabezado y alcance](026--ops-header-filters-local-scope.md) | In progress | Filtros compactos, locales, canales y acciones sin duplicación |
| 4 | [027 — Navegación móvil](027--ops-mobile-navigation.md) | Implemented; QA pendiente | Operaciones, Chats y Menú con stack estable |
| 5 | [028 — Cola de atención](028--ops-attention-priority.md) | Draft | Entrada priorizada mediante señales verificables |

## Relación con requisitos anteriores

- 005/006 permanecen como historial de la primera cola móvil. 025 amplía tarjeta/CTA; 026 elimina la barra proporcional antes permitida; 028 propone otra entrada sin renombrar estados del negocio.
- 011/012/013 aportan integración de órdenes, contactos y chats; verificar contratos actuales antes de asumir paridad completa con panel.
- 027 documenta el spike incremental B de 004; pruebas de router aprobadas, revisión visual/nativa pendiente.
- La propuesta es producto de análisis estático. La cola transversal y la navegación inferior requieren revisión visual y validación del recorrido durante ejecución.
- No se presupone que reservas tenga paridad completa: conservar acceso existente y tratar una ampliación funcional por separado.

## Entrega y alcance

Cada PRP incluye doce secciones, criterios verificables, fuentes, dependencias y preguntas abiertas. Ejecutarlos de uno en uno; no marcarlos completados por generar código solamente.

Integración futura en develop según AGENTS.md. Crear estos documentos no implementa funciones ni autoriza despliegues. Los cambios de contratos que hagan falta se documentan y delimitan antes de tocar backend.
