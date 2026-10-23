# PRP: Header de Operaciones

Fecha: 2026-10-23. Estado: implementado en local. Patrón B. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

En Operaciones el header es buscar, canal, local y Acciones. No hay título visible. Chats no está en ese menú.

## 2. Problema

El título «Operaciones», el nombre de la marca y las líneas de local, periodo y contadores ocupaban la fila y el cuerpo. Chats además se repetía en Acciones, aunque el footer ya lo abre en un toque.

## 3. Criterios de éxito

- En 360 px se ven buscar, canal, local (si aplica) y Acciones, sin scroll horizontal y sin la palabra Operaciones.
- En pedidos y en embudo no hay líneas de «todos mis locales», periodo, canal ni «los contadores corresponden…».
- Buscar, canal, local, fecha y mensajes rápidos hacen lo mismo que antes.
- Acciones no ofrece Chats ni lo deja fijar.

## 4. Historias

Cuando entro a Operaciones, quiero los filtros en el header. Cuando quiero un chat, lo abro desde el footer.

## 5. Requisitos funcionales

P0. Fijas: buscar, canal y local. Local no se muestra si hay un solo local y queda deshabilitado si no hay ninguno.

P0. Catálogo: fecha solo en pedidos, y mensajes rápidos. Lo anclado sale en la fila. Chats no forma parte del catálogo.

P0. El header no muestra el título. El nombre sigue en el `h1` solo para el lector de pantalla.

P0. No se pintan las líneas de contexto del local, de la fecha o del canal, ni la nota de contadores cargados. Pedidos y embudo quedan igual en eso.

P0. Un solo popover abierto.

## 6. Requisitos no funcionales

Reutilizar las claves `ops.filters` de buscar, canal, local, fecha y Acciones. En el teléfono Acciones es solo ícono. Popover de ancho `min(22rem, 100vw - 1.5rem)`.

## 7. Restricciones

`OperationsQuickAccess` es el único menú. No se cambia el permiso de la ruta de Chats. La barra inferior sigue siendo el acceso.

## 8. Datos

`localStorage` `ag.operations.actions.v1`. Valores vigentes: `date`, `messages`. Un `chats` guardado de antes se ignora. Si el valor está corrupto, el default sigue siendo `date`.

## 9. UI

Fila: íconos fijos, lo anclado y Acciones. Buscar abre el campo en un popover. El menú lista buscar, canal, local, fecha y mensajes rápidos.

## 10. Riesgos

Sin las líneas de contexto, el filtro activo solo se ve al abrir el ícono. El ícono pulsado marca cuál está abierto.

## 11. Fuera de alcance

Anclaje en el servidor. Acciones de otras pantallas. Mover el asistente de marca a esta fila. Quitar Chats del footer.

## 12. Preguntas abiertas

Ninguna.
