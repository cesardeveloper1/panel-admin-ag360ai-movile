# PRP: Header de Carta

Fecha: 2026-10-23. Estado: implementado en local. Patrón B. Contrato: [índice](prp-header-acciones.md).

## 1. Visión

En la carta, buscar y crear el producto están en el header. El botón flotante sale de encima de la lista.

## 2. Problema

`ProductsPage` busca con la fila `search` de `StackLayout` y crea con `module-fab--product`, que tapa la lista.

## 3. Criterios de éxito

- Buscar abre el mismo campo y filtra igual.
- Crear abre el mismo `NewProductSheet`.
- El FAB ya no se renderiza.
- En 360 px se ven los dos íconos sin scroll horizontal.

## 4. Historias

Cuando estoy en la carta, quiero buscar y crear desde el header, sin un botón flotante sobre los productos.

## 5. Requisitos funcionales

P0. Acciones fijas: buscar y crear. No hay catálogo.

P0. Buscar deja de ocupar una fila permanente. El popover usa el mismo `query` de la página y se cierra al tocar fuera.

P0. Crear llama a `setIsCreateOpen(true)`. La hoja no cambia: mismos campos, mismo `handleCreateProduct`.

## 6. Requisitos no funcionales

Los dos íconos miden 44 px. El título «Carta» trunca si no cabe. Se reutiliza `menu.search` y `menu.newProduct` como etiqueta accesible.

## 7. Restricciones

No se cambia el alta del producto ni los permisos de la carta. Los chips de categoría siguen en el cuerpo.

## 8. Datos

Ninguno nuevo. `query` e `isCreateOpen` siguen en la página.

## 9. UI

Atrás, título «Productos», ícono de buscar e ícono de crear. Sin FAB. La campana sigue oculta en este módulo.

## 10. Riesgos

El alta queda menos visible que el FAB. El `aria-label` es el texto actual de nuevo producto.

## 11. Fuera de alcance

Editar un producto desde el header. Cambiar categorías.

## 12. Preguntas abiertas

Ninguna.
