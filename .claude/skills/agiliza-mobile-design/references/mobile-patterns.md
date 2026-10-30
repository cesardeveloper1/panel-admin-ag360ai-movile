# Fuentes y patrones móviles

Rutas relativas a `panel-admin-ag360ai-movile`. Localizar el checkout actual; no depender de rutas de esta máquina. Snapshot de referencia: 30 de octubre de 2026. Leer el componente vigente antes de aplicar medidas; los tokens y patrones compartidos prevalecen sobre ejemplos históricos.

## Mapa de implementación

| Necesidad | Fuentes |
| --- | --- |
| Tokens y reglas visuales | `src/theme/variables.css`, `src/theme/agiliza.css` |
| Marca empaquetada | `src/constants/assets.ts`, `src/assets/logo-white.png`, `logo-color.png`, `logo-icon.png`; verificar el uso previsto de cada variante |
| Shell y breakpoint | `src/components/AppShell.tsx`, `src/hooks/useViewport.ts` |
| Encabezado | `src/components/AppHeader.tsx`, `HeaderStatusMenu.tsx`, `Breadcrumbs.tsx` |
| Rutas raíz y detalles | `src/components/layouts/TabLayout.tsx`, `StackLayout.tsx`, `src/hooks/useModuleNav.ts` |
| Menú de teléfono y sidebar | `src/components/MobileSideNav.tsx`, `SideNav.tsx`, `src/navigation/navConfig.ts` |
| Operación | `src/pages/OperationsPage.tsx`, `src/components/OperationsFilters.tsx`, `OperationsQuickAccess.tsx`, `FilterChips.tsx`, `KanbanBoard.tsx` |
| Pedido y cocina | `src/components/OrderCard.tsx`, `KitchenOrderCard.tsx`, `OrderDetailSheet.tsx` |
| Chat | `src/pages/ChatsPage.tsx`, `src/components/ChatComposer.tsx`, `ChannelIcon.tsx`, `PanelChatIcon.tsx` |
| Negocio y catálogo | `src/pages/PaymentsHubPage.tsx`, `ProductsPage.tsx`, `src/components/BusinessModuleGrid.tsx`, `NewProductSheet.tsx` |
| Clientes y locales | `src/pages/MarketingPage.tsx`, `LocationsPage.tsx`, `src/components/ContactCard.tsx`, `NewLocationSheet.tsx` |
| Reportes y asistente | `src/pages/ReportsPage.tsx`, `AgilitoPage.tsx`, `src/components/AgentControls.tsx` |
| Login, marca y arranque | `src/pages/LoginPage.tsx`, `WelcomePage.tsx`, `src/components/RequireBrand.tsx`, `BrandBootShell.tsx`, `BrandTransitionOverlay.tsx`, `AppLaunchSplash.tsx` |
| Reparto | `src/pages/motorized/DispatchQueue.tsx`, `RiderTripPage.tsx`, `PartnerZonesPage.tsx`, `PartnerGroupsPage.tsx`, `PartnerAccountPage.tsx` |
| Nativo | `src/hooks/useNativeChrome.ts`, `src/pages/PaymentCapturePage.tsx`, `PrinterSettingsPage.tsx`, `src/native/` |

Si una ruta desaparece, localizar su equivalente; no reconstruir un componente antiguo para cumplir esta tabla.

## Tokens de referencia

| Papel | Token | Base observada |
| --- | --- | --- |
| Texto principal | `--ag-ink` | `#0a1128` |
| Fondo de pantalla | `--ag-mist` | `#eef1f8` |
| Superficie | `--ag-paper` | `#ffffff` |
| Acento/acción principal | `--ag-pulse` / `--ion-color-primary` | `#8746ff` |
| Fondo de acento | `--ag-pulse-soft` | `#efe8ff` |
| Línea | `--ag-line` | `#e2e8f0` |
| Texto secundario | `--ag-muted` / `--ag-text-secondary` | `#475569` / `#334155` |
| Atención | `--ag-hot` | `#f9500b` |
| Finalizado | `--ag-done` | `#047857` |
| Estado operativo complementario | `--ag-live` | `#2d5366`; comprobar su uso real |
| Radios | `--ag-radius-sm/md/lg` | `8/12/20px` |
| Sombras | `--ag-shadow-sm/md` | Sutil / elevación de panel |
| Títulos | `--ag-font-display` | Outfit |
| Cuerpo | `--ag-font-body` | IBM Plex Sans |
| Datos puntuales | `--ag-font-mono` | IBM Plex Mono |

No copiar estos hex a cada componente. La paleta oscura redefine, entre otros, `--ag-paper` y `--ag-mist`. Revisar contraste y CSS computado, incluidas reglas posteriores y media queries. El morado del logo oficial puede diferir del token de interacción: conservar ambos papeles sin recolorear el asset.

La escala práctica de separación sigue pasos de 4/8/12/16/24 px según el componente. No introducir una nueva escala global para una tarjeta. El chrome táctil usa 44 px; `useViewport` separa tablet desde 768 px en la versión observada. Estas referencias no fijan todo control a la misma altura ni sustituyen las reglas responsive existentes.

## Patrones de pantalla

### Encabezado y shell

`TabLayout` ofrece chrome de raíz, normalmente compacto y sin Volver. `StackLayout` resuelve hijos, origen y controles del header. Cada `IonPage` conserva su identidad de ruta; los layouts fijan `data-ag-route` al montar para que una página cacheada no adopte la ruta de otra.

El shell administra scroll de `IonContent` en teléfono y columna principal en tablet. `lockScroll` se usa cuando una vista, por ejemplo conversación, administra su desplazamiento. Conservar safe areas sin sumarlas dos veces. Los hijos del hub de negocio pueden ocultar hamburguesa y alertas según el layout actual.

### Operaciones

- Respetar modos Embudo/Pedidos y el foco de etapas vigente. No trasladar un kanban de escritorio entero al ancho de teléfono si existe selector de etapa.
- Header: búsqueda y filtros progresivos; estado compartido con chips y vista activa. Evitar filtros duplicados y accesos secundarios redundantes.
- Tarjeta: identificador/estado, cliente e importe, modalidad/hora y local si aporta contexto. Acción siguiente clara sin superponer áreas clicables ni hacer que abrir el detalle cambie estado.
- Error general: aviso con reintento y sin presentar tarjetas antiguas como resultados vigentes. Fallo parcial: delimitar el área afectada.
- Reutilizar `OrderDetailSheet`; no crear un segundo detalle por entrar desde otra pestaña. Acciones y estados dependen de confirmación y permisos vigentes.

### Chat

Identidad/canal en header, historial con scroll propio y compositor accesible al abrir teclado. Mantener mensajes pendientes/fallidos distinguibles. El control de IA corresponde al alcance real de marca, canal o conversación; no copiar un apagado global para resolver un detalle visual. Comprobar cambios de conversación, selección desde pedido y regreso al listado.

### Negocio, catálogo y formularios

La ruta histórica `/app/payments` es el hub visible «Negocio»; no renombrar rutas por su etiqueta sin revisar aliases y consumidores. Reutilizar la grilla de módulos y hojas de edición. Presentar precio, disponibilidad y categoría con jerarquía corta; no confundir deshabilitado por permiso con producto agotado. Un switch de disponibilidad necesita estado pendiente y recuperación ante fallo.

### Reportes y Agilito

Reportes prioriza indicador principal y métricas relacionadas, con periodo visible. Una petición fallida o pendiente no se representa como cero. Agilito prioriza consulta y acciones rápidas existentes; no inventar respuestas, indicadores ni conversaciones para llenar espacio. Con teclado abierto debe seguir siendo posible escribir y enviar.

### Login, bienvenida y estados vacíos

Decisión explícita del usuario: conservar el diseño del login con fondo fotográfico violeta y tarjeta oscura translúcida. Es una excepción aprobada a las superficies claras operativas. No reemplazarlo por un formulario blanco ni rediseñarlo sólo por aplicar esta skill; limitarse a la corrección solicitada salvo nueva instrucción explícita.

Conservar logo y campos accesibles. Pendiente de login, contraseña inválida, sin sesión al arrancar, servicio no disponible y marca no asignada requieren mensajes distintos. No añadir promesas de registro o recuperación a enlaces que no implementan ese flujo. Un formulario debe seguir usable con autocompletado, teclado y texto de error.

Un vacío explica el ámbito: sin pedidos, sin asignaciones, sin coincidencias o sin marca. No reproducir como referencia aprobada una página que sólo tenga texto sin contexto, ni ocultar controles necesarios con la intención de hacerla minimalista.

## Verificación seleccionable

Revisar sólo los checks pertinentes y que sigan existiendo:

- `npm run build`: TypeScript y Vite. Un `tsc --noEmit` aislado no prueba empaquetado ni Android.
- `npx vitest run <archivos>`: elegir casos de `src/components/*.test.tsx`, `src/context/AppContext.reliability.test.tsx`, navegación o reparto según el cambio.
- Navegador: ancho estrecho y teléfono normal, texto largo, vacío/error, claro/oscuro, teclado, foco, overlays y origen de Volver.
- Dispositivo Android para comportamiento dependiente de permisos y APIs nativas. Capturar el límite de la prueba si sólo se usó navegador.

No instalar otra librería de componentes ni cambiar el sistema de navegación para un ajuste visual puntual.
