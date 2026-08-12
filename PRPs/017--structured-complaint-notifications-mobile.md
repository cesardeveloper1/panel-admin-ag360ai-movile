# PRP: Alertas estructuradas de reclamos — móvil y Capacitor

> **Proyecto:** agiliza360-mobile  
> **Versión:** 1.0  
> **Creado:** 2026-08-12  
> **Estado:** Implementado  
> **Patrón:** B — adaptación móvil de contrato compartido

## 1. Project Overview

Actualizar Alertas para consumir reclamos estructurados desde `ssgg`, presentándolos de forma compacta y legible en teléfono, tablet, navegador móvil y Capacitor. El cliente dejará de mostrar como título el bloque completo preparado para WhatsApp.

Dependencia principal: PRP backend `ssgg/PRPs/201--structured-complaint-notifications-backend.md`.

## 2. Problem Statement

El mapper móvil actual convierte `raw.message` directamente en `NotificationItem.title`. Cuando el backend persiste el mensaje de WhatsApp, toda la plantilla con emojis, asteriscos y saltos ocupa el título de una única tarjeta, produce bloques excesivamente altos y mezcla contenido con estructura visual.

La aplicación ya recibe `metadata`, pero el servicio móvil no la modela ni la utiliza para reclamos.

## 3. Success Criteria

- [x] Una alerta moderna de reclamo muestra título corto, tipo, severidad y descripción en campos separados.
- [x] No se muestran asteriscos de Markdown ni emojis estructurales del mensaje de WhatsApp.
- [x] La tarjeta se adapta a 320–430 px y tablet sin overflow ni choque con indicadores.
- [x] Alertas históricas siguen visibles mediante fallback.
- [x] Marcar una o todas como leídas continúa persistiendo en backend.
- [x] La misma alerta produce contenido equivalente en navegador y Capacitor.
- [x] El lector de pantalla anuncia categoría, severidad y contenido en orden útil.

## 4. User Stories (Jobs-to-be-Done)

- Cuando recibo un reclamo en el teléfono, quiero entenderlo de un vistazo sin leer una plantilla de WhatsApp.
- Cuando la severidad es alta, quiero identificarla mediante texto además del color.
- Cuando uso tablet o navegador, quiero la misma información y comportamiento.
- Cuando existe una alerta antigua, quiero seguir pudiendo leerla durante la transición.

## 5. Functional Requirements

### P0

- **FR-001:** Extender el tipo API móvil para incluir `priority`, `category` y metadata estructurada de reclamo.
- **FR-002:** Mapear `complaint` a un `NotificationKind` específico o a una variante visual explícita; no tratarlo como `system` genérico.
- **FR-003:** Para `schemaVersion: 1`, construir el modelo de vista usando metadata, no parseando `message`.
- **FR-004:** Definir título corto (`Reclamo de cliente`), resumen (`cliente · tipo`), severidad, descripción y acción tomada como campos separados.
- **FR-005:** Mantener `message` como fallback para registros legacy o metadata incompleta.
- **FR-006:** Encapsular cualquier compatibilidad legacy en el mapper de servicio; los componentes no deben analizar strings.
- **FR-007:** Mantener los flujos ya conectados de lectura individual y “Marcar todo”.
- **FR-008:** Evitar truncar información crítica; aplicar límite visual solo a la descripción con expansión futura fuera de P0 si fuera necesaria.
- **FR-009:** Añadir traducciones para categoría, severidad y acción tomada sin traducir el texto libre del cliente.

### P1

- **FR-010:** Permitir abrir el detalle del reclamo mediante `complaintId` cuando exista una pantalla/ruta móvil compatible.
- **FR-011:** Añadir actualización por socket usando el mismo mapper que REST.
- **FR-012:** Retirar el fallback legacy después de la ventana de compatibilidad acordada.

## 6. Non-Functional Requirements

- Render robusto ante metadata parcial, versión desconocida o descripción extensa.
- Sin HTML ni Markdown dinámico.
- Touch target mínimo de 44 px y foco visible en navegador.
- Sin scroll horizontal en teléfonos pequeños.
- Mantener scroll fluido de la lista con textos extensos.
- No registrar teléfono ni descripción en telemetría.

## 7. Technical Constraints

- Mantener Ionic React, TypeScript, `notificationService`, `apiFacade`, `AppContext` y `NotificationCard`.
- La normalización debe ocurrir en la capa de servicio/mapper, no dentro del JSX.
- Mantener `VITE_USE_API_MOCK` con fixtures modernos y legacy.
- No depender de APIs exclusivas de Capacitor para el render.
- No modificar el contrato backend desde este repositorio.

## 8. Data Requirements

Extender `NotificationItem` con un modelo presentacional explícito, por ejemplo:

```ts
interface ComplaintNotificationView {
  complaintId?: string;
  clientPhone?: string;
  typeLabel?: string;
  severity?: 'low' | 'medium' | 'high';
  description?: string;
  actionTaken?: 'agent_deactivated' | 'none';
  schemaVersion?: number;
}
```

El mapper recibe el payload de backend y produce un modelo estable para UI. Las variantes modernas, parciales, legacy y desconocidas deben estar cubiertas. No almacenar una segunda copia persistente del contenido.

## 9. UI/UX Requirements

- Usar una categoría visual “RECLAMO”, diferenciada de “SISTEMA”.
- Mostrar un ícono semántico de alerta/reclamo del set Ionicons existente.
- Título corto y estable; cliente/tipo en una línea secundaria cuando el ancho lo permita.
- Severidad visible con etiqueta textual: Alta, Media o Baja.
- Descripción con `white-space` apropiado y wrapping de palabras/teléfonos largos.
- Acción tomada en texto secundario, sin convertir toda la tarjeta en una alerta saturada.
- Conservar los estilos, radios, espaciado y jerarquía actuales de Alertas.
- Respetar `prefers-reduced-motion` si se añade transición de llegada/lectura.

## 10. Risks & Assumptions

- **Riesgo:** móvil se despliega antes que backend. Mitigación: fallback por `message`.
- **Riesgo:** descripciones largas dominan la pantalla. Mitigación: jerarquía compacta, wrapping y límite visual accesible.
- **Riesgo:** metadata sin `schemaVersion`. Mitigación: detectar campos conocidos, pero tratar como legacy si no cumple mínimos.
- **Supuesto:** la lista actual solo obtiene notificaciones no leídas y mantiene estado optimista después de marcar.

## 11. Out of Scope

- Crear la pantalla completa de Gestión de Reclamos en móvil.
- Cambiar la lógica del agente o desactivación automática.
- Migrar documentos históricos.
- Rediseñar el módulo completo de Alertas.
- Implementar notificaciones push del sistema operativo.

## 12. Open Questions

- ¿La tarjeta debe expandir/contraer descripciones largas? Recomendación P0: mostrar hasta un límite legible y dejar preparado el modelo para detalle posterior.
- ¿Debe existir navegación al reclamo antes de construir Gestión de Reclamos móvil? Recomendación: no bloquear P0; mantener `complaintId` disponible.
- ¿Se debe enmascarar el teléfono en dispositivos compartidos? Responsable: Producto/Seguridad.

## Implementation Blueprint

1. Añadir tipos API y modelo de vista de reclamo.
2. Extender el mapper de notificaciones con moderno/legacy.
3. Añadir metadata visual de categoría Reclamo.
4. Adaptar `NotificationCard` sin introducir parsing en JSX.
5. Incorporar fixtures y traducciones.
6. Validar lectura individual/todas, responsive y Capacitor/browser.

## Validation Loop

```bash
npx.cmd tsc --noEmit
npx.cmd eslint src/services/notificationService.ts src/components/NotificationCard.tsx src/pages/NotificationsPage.tsx
npx.cmd vitest run
npx.cmd vite build
```

Casos obligatorios: metadata v1, legacy con Markdown, descripción extensa, teléfono largo, severidad alta/media/baja, metadata parcial, marcar leída, marcar todas y viewports 320×568, 390×844 y tablet.
