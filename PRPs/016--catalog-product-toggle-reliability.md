# PRP: Actualización robusta del estado de productos en móvil

> **Proyecto:** agiliza360-mobile  
> **Versión:** 1.0  
> **Creado:** 2026-08-11  
> **Estado:** Draft  
> **Patrón:** B — mejora de interacción y consistencia de datos

## 1. Objetivo

Hacer que el interruptor de activo/inactivo de productos responda inmediatamente y termine guardando siempre el último estado elegido, incluso cuando el usuario pulsa varias veces rápidamente o modifica varios productos a la vez.

## 2. Problema

El usuario no debe esperar la latencia de red para saber si su acción fue recibida. Las peticiones concurrentes o respuestas fuera de orden pueden dejar un interruptor visualmente incorrecto, duplicar actualizaciones o sobrescribir una elección más reciente.

## 3. Criterios de éxito

- [ ] El cambio visual ocurre en menos de 100 ms desde el toque.
- [ ] Para un producto, una ráfaga de toques termina en el último estado elegido.
- [ ] Productos diferentes pueden actualizarse simultáneamente sin bloquearse entre sí.
- [ ] Una respuesta antigua nunca sobrescribe una mutación más nueva.
- [ ] Ante fallo definitivo, el producto vuelve al último estado confirmado y se muestra un aviso.

## 4. Historias de usuario

- Cuando gestiono el menú desde el teléfono, quiero ver el cambio al instante para continuar trabajando.
- Cuando toco varias veces un interruptor, quiero que se respete mi última elección.
- Cuando actualizo varios productos, quiero que cada uno conserve su propio resultado.
- Cuando pierdo conexión, quiero saber qué cambio falló sin perder los estados confirmados.

## 5. Requisitos funcionales

### P0

- **FR-001:** Implementar actualización optimista por producto.
- **FR-002:** Mantener una cola/mutación independiente por `productId`.
- **FR-003:** Consolidar múltiples pulsaciones antes de enviar el siguiente estado, conservando solo el último estado deseado.
- **FR-004:** Enviar siempre `isActive: boolean` explícito al backend; nunca usar un endpoint que invierta estado.
- **FR-005:** Deshabilitar o marcar visualmente solo el interruptor del producto con una mutación pendiente.
- **FR-006:** Ignorar respuestas que no correspondan a la versión más reciente de la mutación.
- **FR-007:** Reintentar errores transitorios con backoff limitado y aplicar rollback tras agotarlos.
- **FR-008:** Invalidar o reconciliar el catálogo después de guardar, sin recargar toda la pantalla.

### P1

- **FR-009:** Mostrar estado pendiente/error de forma accesible y no intrusiva.
- **FR-010:** Reconciliar cambios recibidos por socket sin pisar una mutación local pendiente.

## 6. Requisitos no funcionales

- La interacción no debe bloquear el scroll ni otros interruptores.
- No más de una petición en vuelo por producto.
- Las actualizaciones de productos distintos deben ejecutarse en paralelo.
- El comportamiento debe ser correcto en navegador móvil, Capacitor y tablet.
- Debe respetar safe areas y touch targets existentes.

## 7. Restricciones técnicas

- Mantener Ionic React, TypeScript y la fachada `apiFacade`.
- Reutilizar el servicio de catálogo y el endpoint `PATCH /product/:id`.
- No cambiar la semántica de `isActive` ni crear estados legacy.
- Mantener `VITE_USE_API_MOCK` funcional para demo/offline.
- No introducir una dependencia de estado global si una cola local por página/servicio cubre el caso.

## 8. Datos y concurrencia

Cada mutación debe incluir `productId`, `desiredIsActive`, `mutationId` local y estado confirmado previo. El cliente debe descartar respuestas con un `mutationId` anterior. El backend debe tratar el PATCH como idempotente y, si existe soporte, devolver `updatedAt` o una versión del producto.

## 9. UI/UX

- El switch cambia inmediatamente.
- Durante el guardado puede mostrar un indicador sutil, sin congelar la lista.
- En error: restaurar el último estado confirmado y mostrar un toast accionable.
- Evitar parpadeos o recargas completas.
- Mantener accesibilidad del `IonToggle` y anunciar cambios relevantes.

## 10. Riesgos y supuestos

- **Riesgo:** socket y mutación local llegan en distinto orden. Mitigar con versión/timestamp y estado pendiente.
- **Riesgo:** usuario pulsa durante un reintento. Mitigar reemplazando el objetivo pendiente, no acumulando toggles ciegos.
- **Supuesto:** el backend acepta estado explícito y responde con el producto actualizado.
- **Dependencia:** contrato estable de `PATCH /product/:id`.

## 11. Fuera de alcance

- Cambiar permisos o roles.
- Rediseñar tarjetas, filtros o catálogo.
- Modificar la lógica del gestor de menú web.
- Persistir una cola offline indefinida en almacenamiento nativo.

## 12. Preguntas abiertas

- ¿El backend devuelve `updatedAt` o una versión monotónica del producto?
- ¿Cuál será el máximo de reintentos y ventana de backoff aprobada?
- ¿Los eventos de catálogo por socket incluyen versión del producto?

## Plan de implementación

1. Crear una abstracción de mutación por producto y conectar `ProductsPage`.
2. Añadir estados pendiente/error y rollback.
3. Reconciliar con socket/cache sin pisar cambios locales.
4. Añadir pruebas unitarias para ráfaga de toques, respuestas fuera de orden, rollback y productos concurrentes.
5. Validar con `npx tsc --noEmit`, ESLint, build y prueba manual en viewport móvil/tablet.

