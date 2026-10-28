# PRP: Sonidos de notificación en la app

Fecha: 2026-10-23. Estado: implementado en local.

## 1. Visión

La app usa los mismos sonidos que el panel. Fuera de la app avisa con una notificación del sistema y ese sonido: en gama baja por el camino corto, y en las demás gamas con alarma exacta. Dentro de la app no crea avisos: solo suena si la campana de alertas está en la pantalla.

## 2. Problema

El panel reproduce `orden.aac`, `preorden.aac`, `chat.aac`, `humano.aac` y `sos.aac`. La app, ante un pedido nuevo, muestra un toast y no suena. En segundo plano no hay aviso con esos audios.

## 3. Criterios de éxito

- Con la app abierta y la campana visible, suena el audio del panel y no aparece toast ni notificación del sistema.
- Con la app abierta y sin campana en pantalla, no suena y no se crea aviso.
- Con la app en segundo plano, sale una notificación del sistema con el audio que corresponde. En gama baja, al momento y sin alarma exacta. En las demás, a la hora exacta.
- Pedido, chat y reclamo usan el mismo archivo que el panel para ese caso. La reserva usa `reserva.aac`, el mismo timbre que una preorden, porque el panel no tiene un audio propio.
- Cada pedido, chat, reclamo o reserva ocupa una sola tarjeta. Un cambio reemplaza esa tarjeta en vez de apilar otra.

## 4. Historias

Cuando llega un pedido y estoy en Agilito, quiero oír el sonido sin un aviso encima del chat.

Cuando la app está atrás en un celular de gama baja, quiero la notificación al momento, sin alarma exacta.

Cuando la app está atrás en otro celular, quiero esa notificación en el instante exacto.

Cuando estoy en Menú y productos, donde no hay campana, no quiero sonido ni aviso.

## 5. Requisitos funcionales

P0. Los archivos viven en `public/sounds` y, para Android, en `res/raw`.

P0. La campana cuenta como accesible si está montada: header de tablet, campana de Agilito, o la campana del menú ⋯ cuando ese menú está abierto. El botón ⋯ cerrado no es la campana.

P0. Primer plano: `decideCue` devuelve `sound` o `silent`. No hay toast de pedido ni notificación local.

P0. Segundo plano o pestaña oculta: `decideCue` devuelve `notification`. En el dispositivo, `LocalNotifications` con canal por sonido. En el navegador, la notificación del sistema usa el sonido del navegador.

P0. Fuera de la app, el camino corto es solo para gama baja (`deviceMemory` de 2 GB o menos). El aviso lo publica el sistema en el momento; el WebView no se queda despierto ni reproduce `Audio()`. El sonido sale de `res/raw` por el canal, ya empaquetado, sin descarga y sin decodificar en JS. Un solo aviso, sin alarma exacta, sin servicio en primer plano y sin wakelock.

P0. En el resto de gamas el aviso es exacto: se programa con alarma exacta y `allowWhileIdle`, para que salga en ese instante aunque el teléfono esté en reposo. Si el dato de memoria no existe, se trata como gama no baja.

P0. Pedidos: suena si el socket trae `playSound === true`. `Pre Orden` y `Programado` usan `preorden.aac`; el resto, `orden.aac`. Motorizado solo cuando el estado está listo para recoger.

P0. Chat: primer mensaje del cliente usa `chat.aac`. El paso a atención humana usa `humano.aac`. Los defaults del panel dejan en silencio Pidiendo y Órdenes.

P0. Reclamo (`category: complaint` en `/events`) usa `sos.aac`, con `orden.aac` si ese audio no arranca.

P0. Reserva (`/reservations`): alta, cambio y cancelación usan `reserva.aac`. El texto lleva número, cliente, personas y hora. La cancelación actualiza la misma tarjeta.

P0. La tarjeta del sistema usa un id estable por asunto (`order:`, `chat:`, `complaint:`, `reservation:`). En el navegador, el mismo `tag`.

P0. El mismo aviso no se repite dentro de 5 segundos.

## 6. Requisitos no funcionales

El primer toque desbloquea el audio del WebView. Eso solo sirve dentro de la app. `prefers-reduced-motion` no aplica: el sonido no es movimiento.

Android 8+ ata el sonido al canal. Cada audio tiene su canal (`ag-cue-orden`, etc.) para no quedar pegado al primero que se cree. En gama baja el canal evita crear un reproductor propio. En las demás gamas la alarma exacta dispara ese mismo canal a la hora pedida.

## 7. Restricciones

No se cambia quién puede ver alertas ni el botón de marcar todas. No se añade la pantalla de configuración de sonidos del panel. El flag `playSound` del socket sigue siendo la decisión de pedido.

## 8. Datos

Eventos ya existentes: `/orders`, `/chat` (`newMessage`, `contactInfoUpdated`), `/events` y `/reservations`.

## 9. UI

Sin controles nuevos. Dentro de la app no hay banner. La lista de alertas sigue cargándose al elegir marca.

## 10. Riesgos

En el teléfono la campana no está en el header: está dentro de ⋯. En Operaciones, con el menú cerrado, no suena. En gama baja el sistema congela el WebView en cuanto la app pasa atrás: por eso ese aviso no usa alarma exacta. En las demás gamas sí. Si el proceso ya está muerto, el socket no llega y no hay push remoto. Un canal de Android ya creado no cambia de sonido hasta reinstalar.

## 11. Fuera de alcance

FCM con la app cerrada. Mapa personal de sonidos (`useOwnConfig`). Sonidos de éxito y error del panel.

## 12. Preguntas abiertas

Ninguna.
