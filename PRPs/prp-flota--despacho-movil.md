# PRP: Despacho móvil del motorizado

Fecha: 2026-10-30. Estado: implementado en local. Patrón B. Sigue a [Pantallas del motorizado](prp-roles--motorizado.md) y al [viaje del repartidor](prp-flota--repartidor.md). El tablero web está en `panel-admin-ag360ai/PRPs/prp-flota--despacho.md`.

## 1. Visión

El motorizado abre el teléfono y ve el despacho de la flota: qué falta asignar, qué ya tiene repartidor y quién está disponible. Zonas, grupos y la cuenta del partner se leen en una lista corta; el formulario largo queda un toque más adentro.

## 2. Problema

En local, `Yango Delivery` entra a `/app/operations` y la pantalla es el título «Por asignar» y la frase «No hay pedidos por asignar». El menú solo tiene Operaciones y Perfil. Zonas, Grupos y Cuenta están en tres íconos sin texto.

Eso deja la app vacía aunque el partner tenga trabajo alrededor de la cocina:

- El listado del API trae pedidos, y en esta cuenta ninguno está en En cocina. Hay aceptados, preórdenes, programados y entregados. La cola vacía es correcta para «por asignar», pero la pantalla no dice que no hay nada en cocina ni en camino, ni ofrece el siguiente lugar útil.
- Zonas sí tiene datos: varios polígonos con nombre. Cada uno ocupa la pantalla con la palabra «Polígono» y dos botones grises, Editar y Eliminar, del ancho del teléfono.
- Grupos abre el formulario: identificador de WhatsApp, nombre, un checkbox de Activo desalineado y la lista larga de locales, casi todos sin marcar.
- Cuenta es otro formulario oscuro ya lleno: supervisor, teléfonos, horario, Yape o Plin y ciudades. No dice si ahora mismo el partner está en turno.
- Perfil muestra tres ceros: Pedidos activos, Alertas y Locales. Esos contadores son del local, no de la flota. El header trae «Agente y alertas». «Usar mi idioma» habla de la marca. Hay dos acciones de borrar la cuenta.
- Una ruta del local (`/app/payments`) se abre con la sesión del motorizado y enseña «Negocio» vacío: «Menú, marketing, locales y marca desde un solo lugar».

## 3. Criterios de éxito

- Con la cola de cocina vacía, el despacho sigue mostrando tres grupos y el acceso a Repartidores. No queda una sola frase en una página en blanco.
- En esta cuenta, Por asignar, Asignadas y En camino salen vacíos con una línea que lo explica. No aparecen Pre orden, Aceptado ni Programado.
- Repartidores lista a las personas de la flota con su presencia, sin formulario de alta.
- Zonas, Grupos y Cuenta se reconocen por el nombre en el menú. La primera vista es un resumen; editar es la segunda.
- Perfil no muestra contadores del local ni «Agente y alertas».
- Una ruta del restaurante no pinta la cáscara de Negocio para este rol.

## 4. Historias

Cuando abro la app y no hay nada en cocina, quiero ver que la cola está al día y quién puede salir, para no pensar que la cuenta está rota.

Cuando me preguntan por una zona o por el horario, quiero el nombre y el dato, para no recorrer un formulario de escritorio.

## 5. Requisitos funcionales

P0. El inicio sigue siendo `/app/operations`. Tres bloques, en este orden: Por asignar (En cocina sin repartidor), Asignadas (En cocina con repartidor, con el nombre) y En camino. Entregado no ocupa el inicio; un enlace «Entregados» abre esa lista.

P0. Cada bloque vacío dice qué está vacío. Si los tres lo están, una sola explicación arriba: nada en cocina ni en camino. No se listan otros estados del local.

P0. El menú nombra Despacho, Repartidores, Zonas, Grupos y Cuenta, y cierra con Perfil. Los tres íconos del header pueden quedar, con el mismo destino y con nombre accesible.

P0. Repartidores, ruta nueva bajo el despacho: nombre y presencia (en turno, en viaje, fuera de horario, sin seguimiento). Sin alta, sin edición y sin baja. Eso sigue en el panel web.

P0. Zonas: lista con el nombre de cada polígono. Editar y eliminar pasan a la ficha de esa zona, no a dos botones por fila en el listado. Agregar zona se queda.

P0. Grupos: lista con nombre, si está activo y cuántos locales tiene. El identificador de WhatsApp y los checkboxes de locales viven en la ficha.

P0. Cuenta: primero un resumen con horario, si el reloj de Lima cae dentro de ese horario, supervisor y ciudades. Guardar sigue en la ficha de edición, con los mismos campos de hoy.

P0. Perfil de este rol: nombre, correo, modo oscuro, cerrar sesión, una sola eliminación de cuenta y la política de privacidad. Sin contadores, sin campana de alertas del local y sin el texto de idioma de una marca.

P0. Si la ruta no es despacho, repartidores, zonas, grupos, cuenta o perfil, el motorizado vuelve al despacho. No se renderiza Negocio.

## 6. Requisitos no funcionales

En 360 px el primer pantallazo del despacho muestra el estado de la cola y el acceso a Repartidores sin scroll. Los controles miden 44 px. El acento sigue siendo `--ag-pulse`. Un error al guardar zona, grupo o cuenta se queda en esa ficha.

## 7. Restricciones

No se amplía el tablero a Pre orden, Aceptado o Programado: eso es del local. No se asigna un pedido que no esté en En cocina. No se crea un repartidor en el teléfono. No se toca el panel web ni ssgg. El correo del login se compara tal como está guardado; este PRP no cambia el sign-in.

## 8. Datos

Pedidos: el `GET /orders` que esta sesión ya recibe. El bloque sale del mismo criterio que el despacho web: En cocina sin `riderId`, En cocina con `riderId`, En camino, Entregado.

Repartidores: el listado que el web ya muestra en `/app/repartidores`, con `presence`.

Zonas, grupos y cuenta: los mismos `deliveryUserService` de hoy. El resumen no pide otro endpoint. «En turno» se calcula en el teléfono con `startTime`, `endTime` y `America/Lima`, fin exclusivo, como el horario de flota que ya existe.

## 9. UI

Despacho a pantalla completa. Título «Despacho». Cada bloque es una lista corta; la fila de un pedido muestra local, dirección y, si ya tiene, el repartidor. Asignar abre el selector que ya existe.

Zonas, grupos y cuenta usan filas como las de Configuración, no campos negros a todo el ancho. En zonas, el botón principal del listado es la fila, no Editar ni Eliminar.

Perfil conserva la tarjeta con el nombre. Debajo, solo apariencia, cuenta y privacidad.

## 10. Riesgos

La cuenta de prueba guarda el correo con mayúscula inicial. La variante en minúsculas responde 401 y el login dice «Correo o contraseña incorrectos». Quien pruebe este PRP tiene que usar el correo tal como está guardado.

Si Repartidores reutiliza el formulario de alta del web, el teléfono vuelve a ser un panel. La lista es de solo lectura.

Mostrar programados en el despacho mezclaría el libro del local con la cola de cocina. El vacío se explica; el pedido programado no entra en estos tres bloques.

## 11. Fuera de alcance

Alta y edición de repartidores, dibujar el polígono como vista principal, foto de entrega, código de recojo, varios pedidos por viaje, mapa de calor y asignación automática. Cambiar mayúsculas del correo en el sign-in. Chats, reportes, Agilito y la campana del local.

## 12. Preguntas abiertas

Ninguna para construir el borrador. Entregados es un enlace, no el tercer bloque del inicio, porque en esta cuenta ya hay entregas y meterlas arriba volvería a tapar la cola.
