# PRP: Mensajes rápidos en pantalla

Fecha: 2026-10-23. Estado: implementado en local. Patrón A.

## 1. Visión

En Operaciones, Mensajes rápidos abre una pantalla con atrás. No abre un modal.

## 2. Problema

El ítem del menú Acciones y el ícono fijado llaman a `OperationsQuickMessages`, un `IonModal`. En el teléfono el modal queda en una franja con el título y Cerrar, encima de pedidos. La lista no tiene sitio propio.

## 3. Criterios de éxito

- Pulsar Mensajes rápidos, desde Acciones o desde el ícono fijado, cambia de ruta.
- No queda ningún `IonModal` de mensajes rápidos.
- Atrás vuelve a Operaciones, en el modo y los filtros que ya estaban.
- La lista, el vacío, la carga y el error con reintento se ven en el cuerpo de la pantalla.

## 4. Historias

Cuando quiero ver los atajos de la marca, quiero una pantalla completa, para leerlos sin tapar los pedidos.

## 5. Requisitos funcionales

P0. La ruta es `/app/quick-messages`. No es un tab del footer.

P0. El header es atrás y el título «Mensajes rápidos». No hay botón Cerrar.

P0. El cuerpo reutiliza la lista actual: `/{shortcut}` y el texto. Misma marca, mismo `listQuickMessages`.

P0. Sin marca, sin datos o con error, se muestran los textos que ya usa el modal: carga, vacío, no disponible y reintentar.

P0. Al navegar se cierran el menú Acciones y el popover de filtros.

## 6. Requisitos no funcionales

El objetivo de atrás mide 44 px. El texto del mensaje conserva los saltos de línea. En 360 px no hay scroll horizontal.

## 7. Restricciones

No se cambia quién ve la acción ni quién puede escribir mensajes. No se toca el panel web ni ssgg. Crear, editar y borrar siguen fuera de esta pantalla.

## 8. Datos

Ninguno nuevo. `QuickMessage` ya trae `_id`, `shortcut`, `text` e `isActive`. La pantalla lista lo que devuelve el servicio.

## 9. UI

Pantalla stack. Atrás a la izquierda, título, sin campana nueva. Debajo, las tarjetas del atajo. El acento sigue siendo `--ag-pulse`. La barra inferior no se muestra en esta ruta.

## 10. Riesgos

Quien esperaba cerrar el modal con un toque fuera ahora usa atrás. El regreso tiene que conservar pedidos o embudo.

## 11. Fuera de alcance

Alta, edición, baja e imágenes. Buscador de atajos. Cambiar el catálogo de Acciones.

## 12. Preguntas abiertas

Ninguna.
