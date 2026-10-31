# Actualización del embudo móvil

El embudo usa GET /operations/conversations por etapa, con funnelWindow=12h,
clientGroup=clients y los filtros actuales de marca, local, canal y búsqueda.
Los totales se solicitan en la primera página; cargar más no los sustituye por
el número de tarjetas descargadas. Las tarjetas respetan la etapa proyectada
por el servidor. Con pedido sigue contando conversaciones, no órdenes.

La conexión /chat compartida se suscribe a operations:subscribe para los roles
staff. connect, operations:wakeup, operations:resync y los eventos de conversación
existentes despiertan una reconsulta agrupada en una ventana fija de 300 ms.
También se reconcilia al recuperar red, foco/visibilidad y cada 30 segundos.

Esta implementación reconsulta snapshots autorizados (no aplica payloads del
socket directamente ni implementa el cursor de cambios incrementales del panel).
Reconstruye las páginas ya cargadas con cursores nuevos para conservar una ventana
coherente. Esto prioriza corrección y compatibilidad; su costo HTTP crece con las
páginas cargadas. Una migración posterior a deltas debe conservar revisión,
pertenencia, totales y resincronización de alcance.

Cambiar de sesión/marca/filtros invalida los resultados anteriores. Una respuesta
tardía no puede repoblar otro alcance. Si falla la reconciliación se retiran los
datos y se ofrece el reintento existente. No se hacen mutaciones de conversaciones.

Verificación local: pruebas del hook, serialización del contrato HTTP, puente del
socket, paginación, denegación, etapa y tarjetas. Los mocks no demuestran recepción
real desde Railway ni comportamiento de Android en segundo plano.
