# PRP: Pantallas por rol — índice

Fecha: 2026-10-28. Estado: borrador. Patrón B.

El panel web cambia de menú según el rol. El móvil entra siempre a la cáscara del owner y recorta por permiso. Cada rol que falta tiene su PRP:

- [Gerente y trabajador](prp-roles--gerente-trabajador.md) — implementado en local
- [Motorizado](prp-roles--motorizado.md) — implementado en local. Lo que falta mostrar, visto en el teléfono: [despacho móvil](prp-flota--despacho-movil.md) y [viaje del repartidor](prp-flota--viaje-movil.md)
- [Superadmin](prp-roles--superadmin.md) — implementado en local

## Contrato común

Se copia el menú visible del panel web. No se inventan módulos. Owner y superadmin en modo marca siguen con Agilito, Operaciones, Chats, Reportes y Negocio.

El permiso del módulo decide si la pantalla existe para esa cuenta. Owner y superadmin en modo marca no pasan por ese filtro. Un módulo apagado no aparece en el footer ni en Negocio.

La primera pantalla después de elegir marca, o de entrar si el rol no elige marca, es la primera de esta lista a la que sí puede entrar: Agilito, Operaciones, Chats, Reportes, Negocio, y para motorizado su tablero. Si ninguna aplica, queda el perfil.

No se toca el panel web, ssgg ni quién puede activar el asistente de la marca. El acento sigue siendo `--ag-pulse`. En 360 px los objetivos miden 44 px.
