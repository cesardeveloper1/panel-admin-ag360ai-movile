# PRP: Pantallas del motorizado

Fecha: 2026-10-28. Estado: borrador. Patrón B. Contrato: [índice](prp-roles-pantallas.md).

## 1. Visión

El motorizado entra a sus entregas y, desde ahí, a zonas, grupos y su cuenta de partner. No ve el menú del local.

## 2. Problema

En el panel web el rol cae en Operaciones, con columnas En cocina, En ruta y Entregados, y tres pantallas propias. En el móvil el rol no está en `navigationAccess`, así que aterriza en el perfil y la campana de alertas, que en la web ni siquiera lleva.

## 3. Criterios de éxito

- Al iniciar sesión se abre el tablero de entregas, sin elegir marca y sin Agilito.
- El tablero muestra solo pedidos en cocina, en camino y entregados, los que el API ya le asigna.
- Zonas, grupos y cuenta partner se abren desde ese tablero y vuelven a él.
- No aparecen Chats, Reportes, Negocio ni la campana de alertas del local.

## 4. Historias

Cuando llego a un local, quiero ver qué está en cocina y qué ya salió, para marcarlo en camino o entregado.

Cuando cambia mi cobertura, quiero editar zonas, grupos de aviso y los datos del partner desde el teléfono.

## 5. Requisitos funcionales

P0. Landing: `/app/operaciones` en modo motorizado. El footer de Agilito, Operaciones, Chats y Menú no se muestra.

P0. El tablero agrupa En cocina (`en_cocina`), En ruta (`en_camino`) y Entregados (`entregado`). No muestra embudo, chat ni `para_recoger`.

P0. En el tablero puede pasar un pedido entre esos tres estados. En el detalle también puede marcarlo cancelado. No otros estados.

P0. El aviso de pedido de este rol sigue la regla ya hecha: solo suena cuando el estado está listo para recoger. Esta pantalla no inventa otro sonido.

P0. Zonas (`/app/partner/zones`): lista de polígonos, alta, edición y baja, con el mapa que ya usa el web. Stack, atrás al tablero.

P0. Grupos (`/app/partner/groups`): grupos de aviso por local, alta y guardado. Mismos campos que `MisGruposPartnerPage`.

P0. Cuenta (`/app/partner/account`): supervisor, teléfonos, horario, Yape o Plin y cobertura. Se edita y se guarda contra el partner de la sesión.

P0. Esas tres entradas son acciones del header del tablero. No son tabs del footer.

## 6. Requisitos no funcionales

El mapa de una zona cabe en el ancho del teléfono y se cierra con atrás. Guardar una zona, un grupo o la cuenta muestra el error del API en la misma pantalla.

## 7. Restricciones

Solo el rol `motorized` entra a estas rutas. No se amplía su alcance de pedidos. No se toca el panel web ni ssgg. No se muestra la campana de alertas del restaurante.

## 8. Datos

Pedidos del motorizado por el socket y el listado que el web ya filtra para ese rol. Zonas, grupos y cuenta salen de `deliveryUserService` y el partner de `useMotorizedBranches`: supervisor, teléfonos, horario, Yape o Plin, cobertura y `notificationGroups`.

## 9. UI

Tablero a pantalla completa, título «Entregas», acciones Zonas, Grupos y Cuenta. Tres columnas en tablet y una lista con segmentos en 360 px. El acento sigue siendo `--ag-pulse`.

## 10. Riesgos

Si el proceso de la app murió, el aviso de pedido no llega: no hay push remoto. El mapa en un teléfono de gama baja puede tardar; la lista de zonas tiene que verse igual sin esperar al mapa.

## 11. Fuera de alcance

Chats, reportes, menú, clientes, locales, Agilito y datos de marca. Flota propia y lista de conductores, ocultos en el web. Crear un partner nuevo.

## 12. Preguntas abiertas

Ninguna.
