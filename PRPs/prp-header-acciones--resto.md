# PRP: Pantallas que se quedan en título

Fecha: 2026-10-23. Estado: borrador. Patrón A. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

Estas pantallas no ganan íconos de relleno. Donde el subtítulo ocupaba la fila, sale. El resto del header se queda.

## 2. Problema

El contrato nuevo deja un hueco: si no se dice qué pasa con Cocina, los hubs y Ajustes, la implementación les inventa acciones para «llenar» el header.

## 3. Criterios de éxito

- Ninguna de estas pantallas muestra Acciones ni un ícono nuevo.
- Cocina y el hub de Negocio ya no llevan subtítulo en el header.
- Atrás, la campana y el avatar siguen donde ya estaban.

## 4. Historias

Cuando abro una pantalla sin una acción propia, quiero el título y no una fila de íconos vacía.

## 5. Requisitos funcionales

P0. Cocina (`KitchenPage`): se quita el subtítulo de marca y «cocina». Atrás a Operaciones se queda. Las pastillas de espera, cocinando y listo siguen en el cuerpo. La campana se queda.

P0. Hub de Negocio (`BusinessHubPage`): se quita el subtítulo con el nombre de la marca. El avatar, el título y la campana se quedan. La grilla no cambia.

P0. Hub de Pagos (`PaymentsHubPage`): header de título, como ahora. Sin acciones nuevas.

P0. Ajustes (`SettingsPage`): cerrar sesión y eliminar la cuenta siguen en el cuerpo. No suben al header.

P0. Datos de marca, Impresión y captura de pago: guardar, subir logo, imprimir y vincular el dispositivo siguen en el cuerpo.

P0. Agilito, login, bienvenida y onboarding no entran en este header de acciones.

## 6. Requisitos no funcionales

Quitar el subtítulo no cambia la altura útil más de una línea y no mueve la barra inferior.

## 7. Restricciones

No se crean atajos que esas pantallas no tienen hoy.

## 8. Datos

Ninguno.

## 9. UI

Título en una línea. Sin íconos de acción de pantalla. Campana y atrás según la pantalla ya los tenga.

## 10. Riesgos

En Cocina, perder el subtítulo esconde la marca. La marca ya se elige antes de entrar y el cuerpo sigue mostrando la cola.

## 11. Fuera de alcance

Rediseñar Agilito, el login o los formularios de estas pantallas.

## 12. Preguntas abiertas

Ninguna.
