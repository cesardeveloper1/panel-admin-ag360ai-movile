# PRP: Acciones en el header — índice

Fecha: 2026-10-23. Estado: borrador. Patrón B.

El header del móvil muestra las acciones de esa pantalla. Si la fila no alcanza, el título de la pantalla no se muestra. Cada pantalla tiene su PRP:

- [Operaciones](prp-header-acciones--operaciones.md)
- [Chats](prp-header-acciones--chats.md)
- [Reportes](prp-header-acciones--reportes.md)
- [Carta](prp-header-acciones--carta.md)
- [Clientes](prp-header-acciones--clientes.md)
- [Notificaciones](prp-header-acciones--notificaciones.md)
- [Pantallas que se quedan en título](prp-header-acciones--resto.md)
- [Mensajes rápidos](prp-mensajes-rapidos-pantalla.md)

## Contrato común

`AppHeader` recibe la lista de acciones. Si hay al menos una, no pinta subtítulo, migas ni la fila `search`. Las fijas van en la fila. El catálogo, si existe, abre Acciones. La campana, si la pantalla ya la muestra, queda al final y no mezcla acciones de la pantalla.

La barra inferior ya es Operaciones, Chats y Menú. Esas tres no se repiten como acción de ninguna pantalla. Chats se abre desde el footer, no desde el menú de Operaciones.

Un toque fuera o Escape cierra el popover. Abrir uno cierra el otro. En 360 px los íconos miden 44 px. En teléfono, Acciones es solo ícono. El acento sigue siendo `--ag-pulse`.

El asistente de toda la marca sigue solo en `HeaderStatusMenu`, para owner y superadmin. No se amplía ningún permiso. No se toca el panel web, ssgg ni la barra inferior.

`TabLayout` y `StackLayout` propagan `actions`. `centeredCompact` no centra el título cuando hay acciones.
