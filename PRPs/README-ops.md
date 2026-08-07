# Epic: Operaciones restaurante — cola simple

Vista de Operaciones orientada a **celular y tablet**: una cola por foco, mismos **nombres de estado** internos/i18n (sin renombrar), menos carga cognitiva que Pedidos/Todos + subtítulos anidados.

## Orden de ejecución

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 005 | [ops-attention-queue](./005--ops-attention-queue.md) | Completed | Cola única + focos Nuevos / En proceso / Entregado |
| 006 | [ops-order-card-urgency](./006--ops-order-card-urgency.md) | Completed | Badge subestado, sort Humano, CTA primaria |

## Restricciones de producto (todas las PRPs del epic)

1. **No cambiar nombres de estados** (`ops.kanban*`, `ops.subStates.*`).
2. **Mobile-first**; tablet solo layout/spacing (misma IA).
3. Target branch: **`develop`** (no `master`).
4. Skills de diseño: product UI (impeccable product register + ui-ux-pro-max); motion sobria.

## Cómo ejecutar

En Agent mode:

- *“Execute PRP 005”* / *“Implementa PRPs/005--ops-attention-queue.md”*
- Luego *“Execute PRP 006”*

## Relación con epic de navegación

El epic DRY nav (001–004) es independiente. Operaciones no requiere 004 Done.
