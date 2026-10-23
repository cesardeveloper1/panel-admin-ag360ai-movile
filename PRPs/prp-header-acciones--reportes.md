# PRP: Header de Reportes

Fecha: 2026-10-23. Estado: implementado en local. Patrón B. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

Reportes abre el periodo desde el header. El texto de las fechas sigue viéndose, ya sin ser un botón dentro del cuerpo.

## 2. Problema

`ReportsPage` abre el rango con `reports-range-summary`, un botón dentro del cuerpo. El header solo tiene el título centrado.

## 3. Criterios de éxito

- El ícono de calendario del header abre el mismo `IonModal` de periodo.
- El botón `reports-range-summary` ya no está en el cuerpo.
- Hoy, un día y un rango siguen aplicando los mismos datos.

## 4. Historias

Cuando miro Reportes, quiero cambiar el periodo desde el header y seguir viendo qué fechas aplican.

## 5. Requisitos funcionales

P0. Acción fija: abrir `openDatePicker`.

P0. El texto `periodSummaryLabel` queda como línea de estado al inicio del cuerpo, sin `onClick`.

P0. No hay catálogo ni Acciones en esta pantalla.

## 6. Requisitos no funcionales

En 360 px el título «Reportes» y el ícono de 44 px caben juntos. El rango largo no vuelve al header.

## 7. Restricciones

No se cambia el cálculo del periodo ni el modal. Solo se mueve el disparador.

## 8. Datos

Ninguno nuevo. `period`, `rangeStart` y `rangeEnd` siguen en el estado de la página.

## 9. UI

Título a la izquierda, ícono de calendario, campana. Debajo del header, la frase del periodo en `--ag-muted`.

## 10. Riesgos

Quien buscaba el botón grande dentro del gráfico no lo encuentra. La línea de estado conserva el mismo texto.

## 11. Fuera de alcance

Nuevos presets de fecha. Exportar el reporte.

## 12. Preguntas abiertas

Ninguna.
