# PRP 029 — El embudo móvil muestra una reserva en curso

Fecha: 2026-10-30. Estado: implementado. Patrón A. Repo: `panel-admin-ag360ai-movile`. Depende de `ssgg/PRPs/390--progreso-reserva-en-tarjeta-de-operaciones.md`. El equivalente de las tarjetas del panel es `panel-admin-ag360ai/PRPs/380--progreso-reserva-en-tarjetas-vista-total.md`.

## 1. Visión del proyecto

En Operaciones, pestaña Embudo, una conversación que ya va por reserva muestra persona, personas, fecha y hora, y zona. Un pedido sigue con nombre, carrito, modalidad y pago. Los chips Iniciando, Pidiendo, Humano y Con pedido no cambian de nombre ni de conteo.

## 2. Problema

`ContactCard` pinta siempre esos cuatro pasos de pedido (`src/components/ContactCard.tsx`). `contactProgress` los arma desde `progress.name`, `cart`, `delivery` y `payment`, y si faltan, desde la sesión de pedido (`src/utils/contactPresentation.ts`).

La captura del embudo lo muestra: Abel y Sergio, en Iniciando, tienen persona, carrito, camión y tarjeta. Si el cliente está reservando, esos tres últimos no se van a llenar. El móvil no tiene el panel «Datos del pedido» del panel web: la fila de la tarjeta es el único avance que ve el operador.

`contactProgress` acepta el `progress` en cuanto trae los cuatro booleanos de pedido. Cuando el PRP 390 agregue `flow` y `reservation`, esa condición seguiría ignorándolos y la tarjeta seguiría en modo pedido.

## 3. Criterios de éxito

- Con `progress.flow === 'reservation'` y `progress.reservation`, la fila muestra nombre, personas, fecha y hora, y zona.
- Cada paso usa el booleano correspondiente: recibido, pendiente si hay sesión, o sin información si no hay sesión. Los colores de `contact-card__step--received`, `--pending` y `--unknown` se mantienen.
- Sin `flow`, o con `flow === 'order'`, la fila actual no cambia, incluido el fallback que lee la sesión.
- El nombre accesible dice el campo y el estado. El ícono de personas no reutiliza el carrito, ni el de fecha el camión, ni el de zona la tarjeta de pago.
- Los textos nuevos están en es y en.
- Las pruebas de `contactPresentation.test.ts` cubren reserva recibida a medias, pedido sin `flow`, y un `progress` de pedido que no debe leerse como reserva.

## 4. Historias

Cuando miro el embudo y el cliente pidió mesa, quiero ver si ya dijo nombre, personas, fecha y zona, para no buscar un carrito. Cuando la conversación es un pedido, quiero la fila de siempre.

## 5. Requisitos funcionales

P0. `contactProgress` mira `flow` antes de los campos de pedido. Si es `reservation` y `reservation` trae los cuatro booleanos, devuelve `name`, `party`, `schedule` y `zone`.

P0. `ContactCard` elige el ícono según el campo. Pedido: persona, carrito, el camión que ya está en SVG, tarjeta. Reserva: `personOutline`, `peopleOutline`, `calendarOutline`, `locationOutline`.

P0. `ContactInfo.progress` admite `flow` y `reservation` opcionales. Una tarjeta en caché sin esos campos sigue compilando y se pinta como pedido.

P0. Claves nuevas en `ops.funnel.progress.fields`: `party`, `schedule`, `zone`. `name` y los estados se reutilizan.

P1. La misma fila aplica en Iniciando, Pidiendo, Humano y Con pedido, porque las cuatro usan `ContactCard`. No se crea otra tarjeta para la reserva.

## 6. Requisitos no funcionales

La tarjeta no pide otro endpoint para saber el flujo. El toque en un ícono no abre el chat. El contraste del paso no depende solo del color: el `aria-label` nombra el dato.

## 7. Restricciones

Archivos: `src/utils/contactPresentation.ts`, `src/utils/contactPresentation.test.ts`, `src/components/ContactCard.tsx`, `src/components/ContactCard.test.tsx` si el render fija los íconos, `src/types/contact.ts`, `src/i18n/locales/{es,en}.json`.

No calcular personas, fecha ni zona desde `sessionData` de la tarjeta. El listado de operaciones no trae el borrador. Esos booleanos llegan en `progress` después del PRP 390.

## 8. Datos

```ts
progress?: {
  hasSession: boolean;
  flow?: 'order' | 'reservation';
  name: boolean;
  cart: boolean;
  delivery: boolean;
  payment: boolean;
  reservation?: { name: boolean; party: boolean; schedule: boolean; zone: boolean };
}
```

`switch_pending` no se interpreta en el móvil. El servidor ya deja `flow` en el flujo vigente.

## 9. UI

La fila sigue centrada, con la línea entre los cuatro pasos y el mismo tamaño. Cambia el dibujo del ícono, no el alto de la tarjeta, el badge de etapa ni el botón del canal. La pestaña Pedidos no usa esta fila.

## 10. Riesgos

Leer `reservation` sin exigir `flow === 'reservation'` podría mezclar un objeto a medias con los íconos de pedido. Las dos condiciones van juntas.

El camión de delivery está dibujado a mano y el pago usa `cardOutline`. Un ícono nuevo de Ionic mal elegido puede repetir la tarjeta. Zona usa `locationOutline`, que hoy también marca el local de atención en otra línea de la tarjeta; el `aria-label` los distingue.

## 11. Fuera de alcance

Abrir el chat desde la tarjeta. Un detalle con los textos de la reserva: el panel web lo cubre en el PRP 381 y el móvil todavía no tiene esa ficha. Renombrar Con pedido. Cambiar los conteos de los chips. La pestaña Pedidos.

## 12. Preguntas abiertas

Ninguna. Los cuatro datos son los del borrador que ya publica el PRP 390: nombre, personas, fecha con hora, y zona.
