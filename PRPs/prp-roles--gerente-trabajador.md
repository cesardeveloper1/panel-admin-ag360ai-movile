# PRP: Pantallas de gerente y trabajador

Fecha: 2026-10-28. Estado: implementado en local. Patrón B. Contrato: [índice](prp-roles-pantallas.md).

## 1. Visión

Gerente y trabajador usan las pantallas del owner que su permiso deja abiertas, más las que el panel web les muestra y el móvil aún no tiene. No ven datos de marca.

## 2. Problema

El rol existe en la sesión, pero el menú es el del owner. Si el módulo está apagado, la ruta sigue sin un destino propio para reservas, carta, marketing, zonas o Agilink. Con varios locales, el web reemplaza el gestor de menú por configuración por local; el móvil no.

## 3. Criterios de éxito

- Tras entrar, no hay selector de marca. La marca es la asignada.
- Operaciones, Chats, Reportes, productos, clientes, locales y Agilito solo aparecen si el módulo correspondiente está habilitado.
- Datos de marca no aparece.
- Con un local se ve el gestor de menú. Con varios, solo configuración por local.
- El trabajador no ve órdenes canceladas ni integraciones de menú. El gerente sí, si el módulo está habilitado.

## 4. Historias

Cuando abro la app como gerente, quiero el mismo trabajo del local que en el panel, sin la configuración de la marca.

Cuando soy trabajador, quiero ese mismo menú menos canceladas e integraciones de menú.

Cuando la cuenta tiene módulos apagados, no quiero ver esas pantallas.

## 5. Requisitos funcionales

P0. Reutilizar Operaciones, Chats, mensajes rápidos, Reportes, productos, clientes, locales, alertas y perfil. El acceso sale de `navigationAccess` con el permiso del módulo, sin el atajo de owner.

P0. Agilito solo si `agente_ia` está habilitado. No es la pantalla forzada si el módulo está apagado.

P0. Pantalla de configuración de reservas, la misma lista y el mismo formulario que `/app/reservaciones/configuracion`. Stack, atrás a Operaciones.

P0. Reportes conserva la pantalla actual y suma, si `reportes` está habilitado: órdenes, ventas por integración, mapa de órdenes y cierre de caja. Órdenes canceladas solo para gerente.

P0. Gestor de menú, un local: categorías, productos, modificadores, agrupadores, carta digital y ver carta. Integraciones de menú solo para gerente.

P0. Varios locales asignados: el gestor de menú se reemplaza por configuración por local. No se listan categorías ni productos sueltos.

P0. Marketing, si `clientes` o `marketing` está habilitado: clientes ya existente, más plantillas de WhatsApp, campañas, quejas y encuesta de local. Sin encuestas NPS.

P0. Locales, si `locales` está habilitado: la lista actual, más zonas de entrega, galería e integraciones de local.

P0. Agilink: configurar, estadísticas y abrir el enlace. Centro de ayuda: la lista de tutoriales.

P1. Cada ítem nuevo vive en Negocio o en el stack de la pantalla padre. El footer sigue siendo Agilito, Operaciones, Chats y Menú, y no repite esos destinos.

## 6. Requisitos no funcionales

La lista de Negocio hace scroll vertical. En 360 px no hay scroll horizontal. Un módulo apagado no deja una ruta a la que se pueda volver con atrás.

## 7. Restricciones

No se amplía ningún permiso. No se muestra datos de marca. No se toca el panel web ni ssgg. El filtro de locales asignados lo sigue imponiendo el API.

## 8. Datos

Los mismos endpoints que el panel para reservas, reportes, menú, marketing, zonas, galería, integraciones, Agilink y tutoriales. El permiso llega en la sesión, módulo y acciones.

## 9. UI

Misma cáscara: header, `--ag-pulse`, campana donde la pantalla de owner ya la tiene. Las pantallas nuevas son stack con atrás. Configuración por local es una lista de locales y, al elegir uno, el formulario de ese local.

## 10. Riesgos

Un gerente con todos los módulos activos vería casi el owner. La diferencia obligatoria es datos de marca y NPS. Si el API no manda permisos, el gerente no debe heredar el bypass del owner.

## 11. Fuera de alcance

Alta de marcas, facturación, torre de control, modelos de IA y el tablero del motorizado. NPS. Notificaciones a grupos y mensajes a supervisores, que el web tiene ocultos.

## 12. Preguntas abiertas

Ninguna.
