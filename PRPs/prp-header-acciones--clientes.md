# PRP: Header de Clientes

Fecha: 2026-10-23. Estado: implementado en local. Patrón B. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

Clientes busca desde el header. Los segmentos siguen en el cuerpo, como filtro de la lista.

## 2. Problema

`MarketingPage` reserva una fila entera del header para el buscador. No hay otra acción de pantalla.

## 3. Criterios de éxito

- El ícono de buscar abre el mismo campo y filtra igual.
- La fila permanente de búsqueda desaparece.
- Los chips Todos, VIP, Regular y Nuevo siguen en el cuerpo y filtran igual.

## 4. Historias

Cuando busco un cliente, quiero hacerlo desde el header y seguir cambiando el segmento en la lista.

## 5. Requisitos funcionales

P0. Acción fija: buscar. Usa el `query` actual. Se cierra al tocar fuera.

P0. No hay catálogo ni se mueven los chips al header.

## 6. Requisitos no funcionales

Un ícono de 44 px. Etiqueta accesible: el placeholder actual de `marketing.search`.

## 7. Restricciones

No se agregan altas, exportaciones ni segmentos nuevos.

## 8. Datos

Ninguno nuevo.

## 9. UI

Atrás, título, ícono de buscar. Debajo, los chips como están. La campana sigue oculta en este módulo.

## 10. Riesgos

El buscador deja de verse hasta el primer toque. El ícono usa el mismo texto de búsqueda.

## 11. Fuera de alcance

Ficha del cliente. Acciones masivas.

## 12. Preguntas abiertas

Ninguna.
