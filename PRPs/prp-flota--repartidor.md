# PRP: Viaje del repartidor

Fecha: 2026-10-28. Estado: implementado en local. Patrón B. Contrato en ssgg: `PRPs/prp-flota.md` y `PRPs/prp-flota--rol-y-asignacion.md`. Rastreo: `PRPs/prp-flota--rastreo.md`. Despacho web: `panel-admin-ag360ai/PRPs/prp-flota--despacho.md`.

## 1. Visión

El rol `RIDER` abre un solo viaje. El `MOTORIZED` del teléfono deja el tablero En cocina y se queda con la cola corta y los ajustes del partner.

## 2. Problema

El móvil del motorizado lista todas las órdenes del partner y ofrece En cocina, En camino y Entregado. Ese es el libro de la empresa. Quien va en la moto necesita el pedido asignado, la dirección y dos avisos: lo recogí y lo entregué.

## 3. Criterios de éxito

- `RIDER` entra a `/app/trip` sin marca y sin el footer del local.
- Ve solo órdenes con su `riderId`. Una activa ocupa la pantalla.
- Recogí envía En camino. Entregué envía Entregado. No hay control de En cocina ni de cancelar.
- `MOTORIZED` ya no usa las columnas En cocina / En ruta / Entregados. Ve por asignar y puede asignar. Zonas, grupos y cuenta siguen.

## 4. Historias

Cuando me asignan un pedido, quiero el local, la dirección, la referencia y si tengo que cobrar.

Cuando lo recojo, quiero un botón y que el local lo vea en camino.

## 5. Requisitos funcionales

P0. Landing de `RIDER`: `/app/trip`. Sin Agilito, Chats, Reportes, Negocio ni campana del local.

P0. Sin viaje activo: lista de los asignados que siguen en En cocina. Al tocar uno, ese queda activo.

P0. Viaje activo: nombre del local, dirección, referencia, productos, monto si el pago es efectivo, teléfono del cliente y un enlace que abre la navegación del teléfono.

P0. Recogí y Entregué, en ese orden. Entregué solo después de Recogí. Cada uno llama al `PUT` de estado que el API ya limita para `RIDER`.

P0. Al entregar, la pantalla vuelve a la lista.

P0. `MOTORIZED` en el móvil: cola Por asignar con selector de repartidor, más zonas, grupos y cuenta. Se retira `MotorizedBoard` de los tres estados de cocina.

P0. El aviso de pedido del `RIDER` suena cuando le asignan un viaje, no cuando el local marca listo para recoger. El aviso del `MOTORIZED` no cambia en este PRP.

P1. Con el API de rastreo, el viaje activo manda la posición como máximo cada 15 segundos y muestra el link para copiarlo. Sin ese API, el viaje funciona igual y no pide permiso de ubicación.

## 6. Requisitos no funcionales

Los botones miden 44 px. En 360 px el título se oculta si la fila no cabe. Acento `--ag-pulse`. La lista hace scroll vertical.

## 7. Restricciones

No se amplía lo que el `RIDER` puede hacer en el API. No se toca el panel web en este repositorio. No se pide permiso de notificación de una marca: este rol no elige marca.

## 8. Datos

`GET /orders` ya filtrado por el token. `PUT /orders/:id/status` solo En camino y Entregado. Asignación, si el usuario es `MOTORIZED`, con `PATCH /orders/:id/rider`.

## 9. UI

Una pantalla de viaje, no un kanban. El paso siguiente es el único botón primario. Navegación abre el mapa del sistema con las coordenadas de `deliveryInfo`.

## 10. Riesgos

Dejar el tablero viejo detrás de un flag haría que el `MOTORIZED` siguiera marcando En cocina desde el teléfono. El tablero se reemplaza.

## 11. Fuera de alcance

Foto de entrega, varios viajes a la vez, zonas editadas por el repartidor y el mapa del despachador.

## 12. Preguntas abiertas

Ninguna.
