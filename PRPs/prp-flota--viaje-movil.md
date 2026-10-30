# PRP: Viaje móvil del repartidor

Fecha: 2026-10-30. Estado: borrador. Patrón B. Sigue a [Viaje del repartidor](prp-flota--repartidor.md). El despacho del compañero motorizado está en [prp-flota--despacho-movil.md](prp-flota--despacho-movil.md).

## 1. Visión

El repartidor abre una sola pantalla y entiende en qué está: sin viaje, con un pedido que todavía no sale, o ya en camino. Si no hay viaje, la pantalla dice quién es y si está en turno. No hereda el menú del local.

## 2. Problema

En local, la cuenta de Cesar entra a `/app/trip` y solo ve «Viaje» y «No tienes pedidos en cocina». No hay nombre, ni turno, ni forma de volver si sale de esa pantalla.

El API de esa sesión sí trae un pedido: está Programado, el paso del repartidor es asignado, tiene local, dirección, referencia, cliente y teléfono, y la hora queda más tarde el mismo día. La pantalla lo esconde porque solo pinta En cocina. El texto dice que no hay pedidos en cocina, que es verdad y a la vez inútil: el viaje asignado no se ve.

Perfil abre la configuración del local: contadores en cero (Pedidos activos, Alertas, Locales), «Agente y alertas» y «Usar mi idioma» referido a una marca. El menú de ese perfil solo lista Perfil. No hay Viaje, así que desde ahí no se regresa al trabajo.

El pedido de prueba además tiene integración Yango y un enlace de seguimiento a nombre de este repartidor. Es suyo. No es un tablero de Yango ni un pedido sin asignar.

## 3. Criterios de éxito

- Sin pedido asignado, la pantalla dice el nombre y si está en turno o fuera de horario. No queda una frase suelta.
- Un pedido asignado que aún no está en cocina se ve, con la hora si es programado, y sin botón de llegada.
- En cocina, el botón es «Llegué al local». En camino, el botón es «Entregué», con cliente, dirección, llamada, WhatsApp y mapa.
- Perfil deja cerrar sesión y volver a Viaje. No muestra contadores ni alertas del local.

## 4. Historias

Cuando me asignan un pedido para más tarde, quiero ver el local y la hora, para saber que ya es mío y que todavía no salgo.

Cuando llego al local, quiero un botón, para que el pedido pase a En camino.

Cuando voy a la casa del cliente, quiero llamar, escribir y abrir el mapa, para no buscar el dato en otro lado.

Cuando no hay nada, quiero saber si estoy fuera de horario, para no esperar un pedido que no va a entrar.

## 5. Requisitos funcionales

P0. El inicio sigue siendo `/app/trip`, sin footer del local y sin elegir marca.

P0. La pantalla tiene un viaje visible, en este orden de prioridad: En camino; si no hay, En cocina asignado a este repartidor; si no hay, el programado o aceptado que ya trae su `riderId`; si no hay ninguno, el estado vacío.

P0. Estado vacío: nombre del repartidor y una de dos líneas, «En turno» o «Fuera de horario», calculada con el horario del partner. Debajo, «No tienes un viaje asignado». No usa la frase actual de «pedidos en cocina» como único contenido.

P0. Pedido asignado que no está en cocina ni en camino: número u hora si viene `scheduledAt`, nombre del local, dirección de recojo y referencia. No muestra «Llegué al local» ni «Entregué». Esos botones esperan a En cocina y En camino.

P0. En cocina: los mismos datos de recojo, cómo llegar (el mapa del teléfono con la coordenada que ya venga) y «Llegué al local». Ese botón hace el `PUT` que pasa el pedido a En camino. No cambia el estado antes de eso.

P0. En camino: cliente, dirección, referencia, llamar, WhatsApp, mapa y «Entregué». El monto se muestra si el cobro es en efectivo. «Entregué» hace el `PUT` a Entregado y la pantalla vuelve al estado que corresponda.

P0. Un pedido con integración, incluida Yango, se muestra igual si el `riderId` es este repartidor. No se ofrece reclamar el envío ni otro tablero de la integración.

P0. Perfil: nombre, correo, modo oscuro, cerrar sesión, una eliminación de cuenta y la política de privacidad. El menú, si se abre, tiene Viaje y Perfil. Sin contadores, sin «Agente y alertas» y sin idioma de una marca.

P0. Desde Perfil, Volver o la entrada Viaje regresan a `/app/trip`.

## 6. Requisitos no funcionales

El botón de la acción siguiente mide 44 px y queda visible sin cazar en el scroll. En 360 px el estado vacío cabe en el primer pantallazo. Acento `--ag-pulse`. Si el `PUT` falla, el viaje sigue en pantalla y se muestra el error.

## 7. Restricciones

El repartidor no ve pedidos de otros, no cancela y no asigna. No se adelanta un programado a En camino desde el teléfono: «Llegué al local» solo existe en En cocina. No se toca el panel web ni ssgg. El horario usa `America/Lima` y el fin es exclusivo, como el resto de la flota.

## 8. Datos

`GET /orders` de esta sesión ya viene filtrado por el token. Hoy ese listado puede traer un Programado con `riderStep` asignado, dirección, referencia, teléfono y `scheduledAt`. El viaje usa esos campos; no hace falta otro recurso para el estado vacío ni para el programado.

`PUT /orders/:id/status` sigue limitado a En camino y Entregado. Presencia y GPS no cambian: la posición se manda en En camino y dentro del horario, como ya está.

El horario del «En turno» sale del partner de la cuenta motorizada ligada a este repartidor (`startTime`, `endTime`). Si el partner no trae horario, se omite la línea de turno y se deja el nombre.

## 9. UI

Una columna. Arriba, el estado en una palabra: Sin viaje, Programado, En el local o En camino. El botón primario es uno solo y solo en En cocina o En camino.

Llamar y WhatsApp usan el teléfono del cliente que ya viene en el pedido. El mapa abre la navegación del sistema; no se embebe un mapa nuevo.

Perfil reutiliza Configuración recortada. No se diseña otra pantalla de cuenta.

## 10. Riesgos

Tratar el programado como si ya estuviera en cocina habilitaría «Llegué al local» antes de que el local cocine. Por eso ese botón no sale en Programado.

Ocultar el pedido porque el partner se llama Yango dejaría otra vez la pantalla vacía: en la cuenta de prueba el único viaje asignado es de esa integración y ya tiene seguimiento a nombre del repartidor.

Si el perfil sigue montado sobre la cáscara del local, el menú y los ceros vuelven aunque el viaje esté bien.

## 11. Fuera de alcance

Foto de entrega, código de recojo, más de un viaje activo a la vez, mapa de calor, asignación automática, editar zonas y el despacho del motorizado. El motorizado no usa esta pantalla.

## 12. Preguntas abiertas

Ninguna. El programado asignado se muestra en espera; no se promueve de estado hasta que el local lo deje en En cocina y el repartidor marque que llegó.
