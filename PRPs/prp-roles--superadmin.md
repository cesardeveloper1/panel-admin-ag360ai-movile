# PRP: Pantallas del superadmin

Fecha: 2026-10-28. Estado: implementado en local. Patrón B. Contrato: [índice](prp-roles-pantallas.md).

## 1. Visión

El superadmin, fuera de una marca, ve la consola de plataforma. Cuando entra a una marca, ve lo mismo que el owner y puede volver a la consola.

## 2. Problema

En el web, sin modo temporal, abre el dashboard y la torre de control, no Operaciones. En el móvil el rol cuenta como owner: cae en Agilito y puede abrir datos de marca. No existe la consola ni el regreso.

## 3. Criterios de éxito

- Sin marca elegida, la primera pantalla es el dashboard de plataforma.
- Desde ahí se llega a torre, reportes, delivery, facturación y configuración, que son las secciones visibles del sidebar web.
- Al elegir una marca se abre Agilito y el menú del owner, NPS incluido.
- Desde ese modo hay una acción para volver a la consola, que suelta la marca.

## 4. Historias

Cuando entro como superadmin, quiero el estado de la plataforma, no el chat de una marca.

Cuando una marca necesita un cambio, quiero entrar como owner y volver sin cerrar sesión.

## 5. Requisitos funcionales

P0. Landing sin marca: `/app/platform`. No muestra el footer del local.

P0. Dashboard: el resumen que el web abre en `/app/dashboard` para este rol.

P0. Torre de control, cuatro pantallas stack: conexiones, usabilidad, agentes IA y resumen analytics.

P0. Reportes de plataforma: mensajes y consumo, órdenes, ventas por integración, anuncios Meta, órdenes canceladas, mapa de órdenes, quejas, encuestas NPS y encuesta de local.

P0. Motorizados: canales de delivery, plantillas de mapas y Yango.

P0. Configuración: marcas, locales de la torre, usuarios, solicitudes de registro y grupos de WhatsApp.

P0. Facturación: estado de cuentas. Modelos de IA: la lista de `/app/modelos-ia`. Centro de ayuda: tutoriales.

P0. Elegir una marca activa el modo owner: Agilito, Operaciones, Chats, Reportes y Negocio, con datos de marca y con NPS. El header de ese modo tiene «Volver a plataforma».

P0. Volver limpia la marca seleccionada y regresa a `/app/platform`.

P1. Cada grupo de la consola es una lista. La pantalla hija es stack con atrás al grupo.

## 6. Requisitos no funcionales

La consola hace scroll vertical. En 360 px el título de una pantalla hija no se trunca si hay acciones: se oculta, como el resto de headers. No se pide permiso de notificaciones de una marca mientras no hay marca elegida.

## 7. Restricciones

Solo `superadmin` entra a `/app/platform` y a sus hijas. El modo marca no amplía permisos más allá de lo que el owner ya ve, salvo NPS, que en el web también es solo de este modo. No se toca el panel web ni ssgg.

## 8. Datos

Los mismos listados que el sidebar web de superadmin. La marca temporal es la que ya guarda la sesión al elegir marca. Salir de ese modo no borra la sesión.

## 9. UI

Consola con título «Plataforma» y cinco entradas: Torre, Reportes, Delivery, Facturación y Configuración. Modelos de IA y Centro de ayuda quedan en Configuración. El acento sigue siendo `--ag-pulse`. En el modo marca, «Volver a plataforma» es una acción del header, no un ítem del footer.

## 10. Riesgos

Varias pantallas de la torre son tablas anchas. En el teléfono la tabla pasa a lista de filas; no se recorta columnas en silencio. Entrar a una marca y matar la app tiene que seguir en esa marca al reabrir, igual que el owner.

## 11. Fuera de alcance

Catálogo global, promociones, sorteos, incidencias y el resto de ítems comentados en el sidebar. El tablero del motorizado. Crear módulos que el web no muestra.

## 12. Preguntas abiertas

Ninguna.
