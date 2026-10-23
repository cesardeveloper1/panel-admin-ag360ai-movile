# PRP: Header de Chats

Fecha: 2026-10-23. Estado: borrador. Patrón B. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

La bandeja busca desde el header. En el hilo, la acción es pausar o activar el asistente de esa conversación. El teléfono deja de compartir la fila.

## 2. Problema

La bandeja (`ChatsPage`, sin hilo) solo tiene el título y la campana. El buscador es una fila aparte. En el hilo, `trailing` junta el teléfono y el interruptor del bot de la conversación, más las migas.

La bandeja se abre desde el footer. Operaciones no ofrece un atajo a Chats.

## 3. Criterios de éxito

- En 360 px la bandeja muestra buscar y la campana.
- El hilo muestra atrás, el nombre y el interruptor del bot de esa conversación.
- El teléfono sigue visible en una línea bajo el header.
- No aparece un filtro de canal nuevo.

## 4. Historias

Cuando abro la bandeja, quiero buscar desde el header. Cuando estoy en un chat, quiero pausar el asistente de esa conversación sin el teléfono al lado.

## 5. Requisitos funcionales

P0. Bandeja. Acción fija: buscar. Abre el mismo campo que hoy está siempre visible y se cierra al elegir un chat o al tocar fuera.

P0. Hilo. Acción fija: el interruptor que ya llama a `onToggleConversationBot`. No se muestra hasta que hay conversación. Sale del header el teléfono y salen las migas.

P0. El teléfono pasa a una línea bajo el header, dentro del hilo, en `--ag-muted`.

P0. Atrás y el nombre del contacto se quedan. El nombre trunca.

## 6. Requisitos no funcionales

El interruptor del hilo es un ícono con `aria-pressed`, no una pastilla de texto. El objetivo sigue en 44 px.

## 7. Restricciones

El asistente de toda la marca no se mueve a esta pantalla. Sigue en `HeaderStatusMenu`. No se cambia quién puede pausar la conversación.

## 8. Datos

Ninguno nuevo. El teléfono y el estado del bot salen de la conversación ya cargada.

## 9. UI

Bandeja: título «Chats», ícono de buscar, campana. Sin la fila permanente del `IonSearchbar`.

Hilo: atrás, nombre, interruptor. Debajo, el teléfono en una sola línea.

## 10. Riesgos

Esconder el buscador detrás de un ícono. El `aria-label` usa el texto actual de buscar y el campo es el mismo.

## 11. Fuera de alcance

Filtros de canal en la bandeja. Rediseñar el compositor o el historial.

## 12. Preguntas abiertas

Ninguna.
