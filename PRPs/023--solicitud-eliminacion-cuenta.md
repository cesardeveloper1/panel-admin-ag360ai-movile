# PRP 023 — Botón de eliminación de la propia cuenta

Fecha: 2026-10-21. Estado: implementado. Patrón A.

La regla del mes, la recuperación al iniciar sesión y el borrado están en [PRP 382 de ssgg](../../ssgg/PRPs/382--solicitud-eliminacion-cuenta.md). Este archivo solo ubica el botón.

## 1. Visión del proyecto

En Configuración, sección de cuenta, quien no es superadmin puede pedir la eliminación de su propia cuenta.

## 2. Problema

`src/pages/SettingsPage.tsx` tiene cerrar sesión y un enlace a la página pública de eliminación. Ese enlace no pide ni ejecuta el borrado. El botón de este PRP va en la sección `settings.account`, junto a cerrar sesión.

## 3. Criterios de éxito

- La sección de cuenta muestra la solicitud a quien no es superadmin.
- Confirmar llama al endpoint del PRP 382, muestra la fecha límite y cierra la sesión hacia `/login`.
- El enlace público de la sección Privacidad puede seguir explicando el proceso mientras la página no se actualice.
- No se anuncia que la app borra la cuenta en el momento.

## 4. Historias

Cuando estoy en Configuración, quiero confirmar la eliminación de mi usuario, para dejarlo pendiente durante un mes.

## 5. Requisitos funcionales

P0. Botón en la lista `settings.account` de `SettingsPage`. Confirmación en el mismo estilo que el `IonAlert` de cerrar sesión, con la fecha que devuelve el backend.

P0. Al aceptar, cerrar sesión con el `logout` ya usado por la pantalla.

P0. Ocultar el botón si la sesión es superadmin.

P0. Textos en `es.json` y `en.json`.

## 6. Requisitos no funcionales

El botón no parte la solicitud hasta la confirmación. Si el endpoint falla, la sesión sigue abierta.

## 7. Restricciones

No calcular los 30 días en el cliente. No sustituir la API por un mock para esta acción.

## 8. Datos

La confirmación usa `deletionDueAt` de ssgg. No se guarda en el almacenamiento del teléfono.

## 9. UI

Acción destructiva, distinta de cerrar sesión. El texto dice que entrar de nuevo antes de la fecha recupera la cuenta y que, si no vuelve, se dan de baja los contratos de sus marcas.

## 10. Riesgos

Dejar solo el enlace público haría creer que la solicitud ya está hecha. El botón nuevo es el que llama a ssgg.

## 11. Fuera de alcance

El cron, el login de recuperación y el borrado. Publicar la app. Cambiar la página pública hasta el P1 del PRP 382.

## 12. Preguntas abiertas

Ninguna. El contrato está en el PRP 382.
