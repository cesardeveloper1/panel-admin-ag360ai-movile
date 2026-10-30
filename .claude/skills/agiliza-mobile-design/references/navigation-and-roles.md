# Navegación, roles y reparto

Rutas relativas al checkout móvil. Consultar el contrato vigente antes de cambiar acciones: esta referencia conserva invariantes de UX, no reemplaza la autorización del backend.

## Fuentes

| Área | Referencias |
| --- | --- |
| Registro y aliases | `src/navigation/appRouteRegistry.ts`, `navConfig.ts`, `staffScreens.ts`, `platformScreens.ts`, `motorizedScreens.ts` |
| Capacidades y destino inicial | `src/navigation/navigationAccess.ts`, `src/utils/orderActions.ts` |
| Transiciones | `src/hooks/useAppNavigation.ts`, `useModuleNav.ts`, `src/navigation/navigationIntent.ts`, `src/utils/instantNavAnimation.ts`, `syncTabVisibility.ts` |
| Sesión y marca | `src/pages/LoginPage.tsx`, `WelcomePage.tsx`, `src/components/RequireBrand.tsx`, `src/context/AppContext.tsx` |
| Persistencia de sesión | `src/services/authService.ts`, `api.ts`, `src/utils/authSession.ts`, `nativeRefreshTokenStorage.ts` |
| Despacho y viaje | `src/pages/motorized/DispatchQueue.tsx`, `RiderTripPage.tsx`, `fleetTrip.ts`, `fleetHours.ts`, `useFleetSchedule.ts` |
| Datos de reparto | `src/services/deliveryPartnerClient.ts`, `orderService.ts` |

## Evitar regresiones de Ionic

- Las páginas de `IonRouterOutlet` pueden quedar montadas al navegar. Un efecto de una página cacheada no debe redirigir desde otra ruta, cambiar su identidad ni recargar su contexto como si siguiera activa.
- Usar `useAppNavigation` para entrar a raíz/detalle y volver. Evitar `window.location` como navegación habitual, pushes directos por cada página o nuevas esperas arbitrarias para forzar el outlet.
- Login debe tener un único dueño de su redirección tras autenticar. Al salir, reemplazar la ruta de autenticación sin volver primero a una página protegida. No navegar de nuevo al mismo destino en cada render.
- Una ruta raíz y una hija tienen historias diferentes. Volver debe recuperar el origen real y su estado, incluyendo filtros o conversación cuando corresponde; no forzar siempre el hub «Negocio».
- Mantener `data-ag-route`/marcador del registro por página. No remover clases internas `ion-page-hidden` globalmente ni subir z-index a toda pantalla para tapar una transición incorrecta.
- Animación y sincronización de visibilidad son compartidas. Comprobar que hay una página activa visible, sin salida y entrada simultáneamente transparentes ni capas antiguas encima. Respetar el intento de navegación más reciente.
- Distinguir splash de arranque, restauración de sesión y carga de marca. Un spinner no es recuperación de una excepción o un bucle de rutas.

## Experiencia por rol

| Rol | Experiencia que conservar |
| --- | --- |
| Owner | Selección/gestión de su marca y módulos autorizados. El alcance sigue siendo el real de esa cuenta. |
| Manager / worker | Mismos componentes de operación según permisos y locales asignados; no inventar accesos porque el diseño de owner tenga un botón. Sin asignación requiere un estado explícito. |
| Motorizado | Operador del partner de reparto: despacho/asignación y herramientas de zonas, grupos y cuenta conforme al contrato. No confundirlo con el RIDER individual. |
| RIDER | Pantalla de viaje y perfil según permisos; sin selector de marca ni dashboard de negocio. Destino inicial observado: `/app/trip`. |
| Superadmin | Contexto de plataforma y marca activa separados. No usarlo como prueba de que los demás roles ven o pueden ejecutar lo mismo. |

Usar `canNavigate`, `navigationLandingPath`, permisos y capacidades existentes. Los enlaces visibles no sustituyen validación del servidor. Un actor sin marca puede ser perfectamente válido para flota; no enviarlo a una bienvenida que espera marcas ni cargar catálogos de negocio innecesarios.

## Reparto y tracking

- Despachador: identidad de pedido/local y siguiente acción de asignación. Si no hay riders, indicarlo y mantener deshabilitada la asignación conforme al contrato; un rediseño no autoriza crear cuentas ni asignar pedidos reales.
- RIDER: priorizar pedido activo, destino/referencia, contacto permitido y acción siguiente. Recogida, llegada, en ruta y entrega son estados distintos: tomar los nombres y transiciones de la implementación vigente, no inventar una secuencia por la ilustración.
- Acciones de llamar, navegar y compartir enlace corresponden a datos reales del pedido. No sustituir navegación al destino por un mapa decorativo ni afirmar que se compartió algo si sólo se copió un enlace.
- Horario, presencia y geolocalización son estados separados. En la versión observada, el envío de posición depende de viaje en ruta, horario y geolocalización disponible. Comprobar `useFleetSchedule`, `fleetHours` y `RiderTripPage` antes de describir tracking como activo.
- Diferenciar permiso de ubicación pendiente/denegado, posición no obtenida y envío fallido cuando se trabaje ese flujo. No prometer ubicación en segundo plano por haber probado `navigator.geolocation` en una pestaña.
- Datos de clientes, domicilios, teléfonos y enlaces de tracking no entran en capturas públicas. Usar un pedido de demostración autorizado, o registrar que la verificación queda pendiente. No cambiar estados de una entrega real para obtener capturas.

## Pruebas cuando cambie comportamiento

Seleccionar las que sigan presentes: `src/pages/authNavigation.test.tsx`, `src/hooks/useAppNavigation.test.tsx`, `src/navigation/navigationAccess.test.ts`, `src/navigation/operationsViewState.test.ts`, `src/pages/motorized/fleetTrip.test.ts`, `fleetHours.test.ts` y tests de servicios afectados.

Comprobar en navegador: entrar desde login, recargar login sin sesión, restaurar sesión existente, abrir Perfil y volver, cerrar y volver a entrar, abrir un detalle directamente. Para flota, separar pruebas del operador y RIDER. Ejecutar pruebas de capacidades para no introducir botones fuera de alcance. Declarar los checks previos fallidos y los flujos nativos no verificados sin presentarlos como validados.
