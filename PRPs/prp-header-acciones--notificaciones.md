# PRP: Header de Notificaciones

Fecha: 2026-10-23. Estado: implementado en local. Patrón B. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

Marcar todas como leídas es la acción del header. La campana de alertas no se duplica en esta pantalla.

## 2. Problema

`NotificationsPage` ya pasa `action` con el texto «marcar todas» cuando hay no leídas, y `showAlerts={false}`. El header sigue tratándola como un botón de texto junto al título, no como la acción principal de la fila.

## 3. Criterios de éxito

- Con no leídas, el header muestra la acción de marcar todas.
- Sin no leídas, esa acción no está.
- Sigue llamando a `markAllNotificationsRead`.
- No aparece la campana.

## 4. Historias

Cuando tengo alertas sin leer, quiero marcarlas todas desde el header.

## 5. Requisitos funcionales

P0. Acción fija solo si `notifications.some(n => n.unread)`.

P0. El toque hace lo mismo que el `action` actual.

P0. `showAlerts` sigue en falso. Atrás se conserva.

## 6. Requisitos no funcionales

La acción cabe en 360 px. Si el texto no entra, queda el ícono con `aria-label` igual a `notifications.markAll`.

## 7. Restricciones

No se cambia el modelo de notificaciones ni se marcan leídas al abrir la pantalla.

## 8. Datos

Ninguno nuevo. La lista sale de `useApp().notifications`.

## 9. UI

Atrás, título, acción de marcar todas. Sin campana y sin Acciones.

## 10. Riesgos

Pasar de botón de texto a ícono esconde el verbo. El `aria-label` conserva la frase actual.

## 11. Fuera de alcance

Filtros de alertas. Borrar notificaciones.

## 12. Preguntas abiertas

Ninguna.
