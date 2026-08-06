# Epic: DRY navigation & layouts (agiliza360-mobile)

Refactor de navegación y chrome para poder añadir features sin duplicar paths ni pelear con el stack de Ionic.

## Orden de ejecución

| # | PRP | Status | Notas |
|---|-----|--------|--------|
| 001 | [route-registry](./001--route-registry.md) | Done | Fundación — registry único |
| 002 | [business-modules-catalog](./002--business-modules-catalog.md) | Done | Catálogo hubs |
| 003 | [tab-stack-layouts](./003--tab-stack-layouts.md) | Done | Chrome DRY |
| 004 | [ionic-nav-stable](./004--ionic-nav-stable.md) | Draft | Spike obligatorio |

## Estado actual (contexto Cesar)

- Hamburguesa global; BottomNav desactivado en `AppShell`
- `pushTabRoot` + `syncTabVisibility` mitigan pantallas fantasma
- Módulos de negocio resaltan **Pagos** en nav
- Headers de módulos compactos (back + título)

## Cómo ejecutar un PRP

En Agent mode: *“Execute PRP 001”* o *“Implementa PRPs/001--route-registry.md”*.

Seguir la skill `prp-manager` (Workflow 3: Execute).

## Template

Ver [templates/prp_base.md](./templates/prp_base.md) (stack Ionic React + Vite + ESLint + Vitest).
