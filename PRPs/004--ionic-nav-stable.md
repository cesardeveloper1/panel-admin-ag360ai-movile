# PRP: Navegación Ionic estable (eliminar workarounds)

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-06  
> **Status:** Draft  
> **Depends on:** PRP 001 (registry + pageMarker); idealmente 003 (layouts con IonPage único)  
> **Branch target:** `develop`

---

## Goal

Sustituir los workarounds DOM/CSS (`syncTabVisibility` por selectores de contenido, `pushTabRoot` con `goBack` + `setTimeout`, CSS de páginas hermanas) por una estrategia de navegación sostenible y testeable.

Estado final: tabs y stacks se muestran/ocultan de forma determinista; sin pantallas fantasma al ir Productos → Agilito/Pagos.

## Why

- Los parches actuales funcionan pero son frágiles ante nuevas pages/CSS.
- Escala mal: cada feature puede reabrir bugs de stack Ionic.
- `fadeNavAnimation` custom + `root`/`replace` ya demostró dejar Productos visible con URL `/app/agilito`.

## What

### Spike (obligatorio antes de implementar)
Elegir **una** estrategia y documentarla en Notes del PRP:

| Opción | Pros | Contras |
|--------|------|---------|
| **A. IonTabs** por tab raíz | Patrón Ionic oficial | Refactor grande de App.tsx |
| **B. `data-ag-route` en cada IonPage** + sync por atributo | Cambio incremental | Sigue habiendo sync manual |
| **C. Un solo shell + React Router outlet sin stack Ionic** | Simple mental model | Pierde transiciones Ionic |

Recomendación inicial: **B corto plazo**, evaluar **A** si hay tiempo de spike ≥1 día.

### Success Criteria
- [ ] Spike documentado con decisión A/B/C
- [ ] Productos → menú/tab Agilito muestra solo Agilito (URL + UI)
- [ ] Productos → Pagos muestra solo Pagos
- [ ] `syncTabVisibility` basado en selectores `.agilito-layout`/`.hub-grid` eliminado o reducido a `data-ag-route`
- [ ] Al menos 3 flujos automatizados (Playwright o script) en CI local documentados
- [ ] lint + build OK

---

## All Needed Context

### Documentation & References
```yaml
- file: src/hooks/useAppNavigation.ts
  why: pushTabRoot goBack+timeout — comportamiento a reemplazar/simplificar

- file: src/utils/syncTabVisibility.ts
  why: matchers CSS frágiles

- file: src/utils/instantNavAnimation.ts
  why: fade custom; probar default Ionic en tabs

- file: src/theme/agiliza.css
  why: reglas ion-page-hidden + :has(~) para footers/hamburguesa

- file: src/App.tsx
  why: IonRouterOutlet flat — candidato a IonTabs

- url: https://ionicframework.com/docs/react/navigation
  why: IonReactRouter, IonTabs, IonRouterOutlet nested patterns
  critical: tabs mantienen stacks independientes

- file: PRPs/001--route-registry.md
  why: pageMarker / data-ag-route deben salir del registry
```

### Known Gotchas
```ts
// CRITICAL: no usar history.push para cambiar tabs
// CRITICAL: no borrar pushTabRoot hasta que la nueva estrategia pase smoke
// CRITICAL: AGENTS.md mobile-first — IonTabs debe verse bien en 390px
// GOTCHA: múltiples AppShell/MobileSideNav en stack → CSS :has(~) ya mitiga hamburguesa doble
```

---

## Implementation Blueprint

### Tasks
```yaml
Task 0: SPIKE (0.5–1 día)
  - Probar IonTabs mínimo (2 tabs) en branch throwaway O
  - Probar data-ag-route en IonPage de Agilito+Products+Payments
  - Escribir decisión en Notes + actualizar Status → Ready

Task 1: Implementar estrategia elegida
  - MODIFY App.tsx / layouts / useAppNavigation según A o B
  - Registry pageMarker = [data-ag-route="..."] si B

Task 2: Simplificar o eliminar syncTabVisibility selectores de contenido
Task 3: Revisar CSS :has(~) — mantener solo si sigue haciendo falta
Task 4: Tests Playwright (o checklist automatizable) para 3 flujos
Task 5: lint/build + regresión manual completa nav
```

### Integration Points
```yaml
NAV:
  - MobileSideNav / SideNav siguen llamando go()
LAYOUTS:
  - StackLayout/TabLayout deben setear data-ag-route si opción B
```

---

## Validation Loop

```bash
npm run lint
npx tsc --noEmit
npm run build
# Playwright o script documentado en PRPs/scripts o package.json
```

Flujos mínimos:
1. Login → marca → Agilito → Productos → Agilito (UI = Agilito)  
2. Pagos → Productos → Volver → Pagos  
3. Productos → Reportes → Agilito  

---

## Final Checklist

- [ ] Decisión spike documentada
- [ ] Sin pantallas fantasma en flujos 1–3
- [ ] Workarounds CSS/DOM reducidos o justificados
- [ ] Mobile-first OK
- [ ] lint/build OK

---

## Anti-Patterns to Avoid

- ❌ No “arreglar” solo con más `setTimeout`
- ❌ No mezclar IonTabs a medias (half-migrated outlets)
- ❌ No eliminar fade animation global sin probar regresiones de motion (AGENTS.md)

---

## Notes

- Confidence: **6/10** hasta completar spike
- Out of scope: rediseño de Agilito composer; reactivar BottomNav
- Actualizar este PRP a **Ready** tras Task 0
