# PRP: Sonidos de notificación en la app

Fecha: 2026-10-23. Estado: implementado en local.

## 1. Visión

La app usa los mismos sonidos que el panel. Fuera de la app avisa con una notificación del sistema y ese sonido, en un camino corto pensado para celulares de gama baja. Dentro de la app no crea avisos: solo suena si la campana de alertas está en la pantalla.

## 2. Problema

El panel reproduce `orden.aac`, `preorden.aac`, `chat.aac`, `humano.aac` y `sos.aac`. La app, ante un pedido nuevo, muestra un toast y no suena. En segundo plano no hay aviso con esos audios.

## 3. Criterios de éxito

- Con la app abierta y la campana visible, suena el audio del panel y no aparece toast ni notificación del sistema.
- Con la app abierta y sin campana en pantalla, no suena y no se crea aviso.
- Con la app en segundo plano, sale una notificación del sistema con el audio que corresponde, sin depender de que el WebView siga vivo.
- Pedido, chat y reclamo usan el mismo archivo que el panel para ese caso.

## 4. Historias

Cuando llega un pedido y estoy en Agilito, quiero oír el sonido sin un aviso encima del chat.

Cuando la app está atrás, incluso en un celular con poca memoria, quiero la notificación del sistema con ese mismo sonido.

Cuando estoy en Menú y productos, donde no hay campana, no quiero sonido ni aviso.

## 5. Requisitos funcionales

P0. Los archivos viven en `public/sounds` y, para Android, en `res/raw`.

P0. La campana cuenta como accesible si está montada: header de tablet, campana de Agilito, o la campana del menú ⋯ cuando ese menú está abierto. El botón ⋯ cerrado no es la campana.

P0. Primer plano: `decideCue` devuelve `sound` o `silent`. No hay toast de pedido ni notificación local.

P0. Segundo plano o pestaña oculta: `decideCue` devuelve `notification`. En el dispositivo, `LocalNotifications` con canal por sonido. En el navegador, la notificación del sistema usa el sonido del navegador.

P0. Fuera de la app, el camino es el de un celular de gama baja. El aviso lo publica el sistema en el momento; el WebView no se queda despierto ni reproduce `Audio()`. El sonido sale de `res/raw` por el canal, ya empaquetado, sin descarga y sin decodificar en JS. Un solo aviso, sin alarma exacta, sin servicio en primer plano y sin wakelock. Si el proceso ya murió, este camino no aplica.

P0. Pedidos: suena si el socket trae `playSound === true`. `Pre Orden` y `Programado` usan `preorden.aac`; el resto, `orden.aac`. Motorizado solo cuando el estado está listo para recoger.

P0. Chat: primer mensaje del cliente usa `chat.aac`. El paso a atención humana usa `humano.aac`. Los defaults del panel dejan en silencio Pidiendo y Órdenes.

P0. Reclamo (`category: complaint` en `/events`) usa `sos.aac`, con `orden.aac` si ese audio no arranca.

P0. El mismo aviso no se repite dentro de 5 segundos.

## 6. Requisitos no funcionales

El primer toque desbloquea el audio del WebView. Eso solo sirve dentro de la app. `prefers-reduced-motion` no aplica: el sonido no es movimiento.

Android 8+ ata el sonido al canal. Cada audio tiene su canal (`ag-cue-orden`, etc.) para no quedar pegado al primero que se cree. En gama baja el canal evita crear un reproductor propio y deja el audio al sistema, que es quien sigue sonando si el WebView ya está congelado.

## 7. Restricciones

No se cambia quién puede ver alertas ni el botón de marcar todas. No se añade la pantalla de configuración de sonidos del panel. El flag `playSound` del socket sigue siendo la decisión de pedido.

## 8. Datos

Ningún dato nuevo. Eventos ya existentes: `/orders`, `/chat` (`newMessage`, `contactInfoUpdated`) y `/events`.

## 9. UI

Sin controles nuevos. Dentro de la app no hay banner. La lista de alertas sigue cargándose al elegir marca.

## 10. Riesgos

En el teléfono la campana no está en el header: está dentro de ⋯. En Operaciones, con el menú cerrado, no suena. En gama baja el sistema congela el WebView en cuanto la app pasa atrás: por eso el aviso no puede esperar a que JS reproduzca el audio. Si el proceso ya está muerto, el socket no llega y no hay push remoto. Un canal de Android ya creado no cambia de sonido hasta reinstalar.

## 11. Fuera de alcance

FCM con la app cerrada. Mapa personal de sonidos (`useOwnConfig`). Sonidos de éxito y error del panel.

## 12. Preguntas abiertas

Ninguna.
