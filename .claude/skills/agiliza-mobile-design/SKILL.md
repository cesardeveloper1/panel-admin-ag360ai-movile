---
name: agiliza-mobile-design
description: "Mantener y consolidar el diseño y la UX de Agiliza360 móvil (panel-admin-ag360ai-movile) al crear, modificar o revisar pantallas, componentes, formularios y navegación Ionic/Capacitor, incluidos motorizados y RIDERS. Usar para frontend de esta app; no trasladar el dashboard web ni aplicar a backend puro o imágenes promocionales de Play Store."
---

# Diseño de Agiliza360 móvil

Extender un solo sistema visual e interactivo para la app, con prioridad al teléfono. La experiencia debe ser clara durante una operación real: encontrar el pedido, entender su estado y completar la siguiente acción con una mano. Una instrucción explícita nueva del usuario tiene prioridad sobre estas convenciones. No convertir un cambio puntual en un rediseño de toda la app.

## Elegir la referencia

- Leer `AGENTS.md` del checkout actual. Si existe `.codegraph/`, consultar CodeGraph antes de localizar código desconocido. Trabajar con el árbol vigente, sin asumir que `main`, la rama local y la versión de Play son iguales.
- Prioridad: petición y referencias actuales del usuario; decisiones de producto aquí registradas; componentes y tokens vigentes; pantalla vecina que resuelva el mismo problema. Una maqueta o screenshot de tienda no es una especificación de permisos ni de comportamiento.
- Leer [references/mobile-patterns.md](references/mobile-patterns.md) para fuentes, tokens, composición y patrones por pantalla. Leer [references/navigation-and-roles.md](references/navigation-and-roles.md) cuando se toque navegación, autenticación, permisos o reparto.
- Consolidar lo repetido en el componente compartido pertinente. Una pantalla vacía, una excepción de CSS o una regresión no se convierte en patrón por existir en el repositorio.

## Identidad y base visual

- Usar `src/theme/variables.css`, `src/theme/agiliza.css` y las clases compartidas `ag-*`. El móvil usa Outfit para títulos, IBM Plex Sans para cuerpo e IBM Plex Mono para datos puntuales; no imponer Inter/Tailwind/shadcn del panel web.
- Conservar superficies claras neutrales, texto oscuro y violeta como acento principal. Reutilizar tokens semánticos para estados, líneas, radios y sombras; verificar también `.ion-palette-dark`. Los valores de referencia están en `mobile-patterns.md` y deben contrastarse con el CSS actual.
- Usar logos oficiales empaquetados desde `src/constants/assets.ts`; conservar proporciones, colores y área legible. No recrear la marca como texto ni depender de una URL remota para mostrar el logo en el arranque.
- Usar Ionicons y componentes de icono existentes como `PanelChatIcon` y `ChannelIcon`. Una misma acción mantiene su icono y nombre accesible.
- Evitar estilos por pantalla que creen otro sistema de tarjetas, grises o controles. Revisar la cascada y reglas posteriores del CSS antes de añadir una excepción; no acumular `!important` para tapar conflictos.

## Composición en teléfono

- Diseñar primero al ancho estrecho admitido. Comprobar 360 px y un teléfono de 390–432 px como referencias de revisión; no son nuevos breakpoints del producto. El cambio a tablet lo gobierna `useViewport` y el layout existente.
- Reutilizar `AppShell`, `AppHeader`, `TabLayout` y `StackLayout` según el tipo de ruta. Jerarquía: contexto y título; acciones de la vista; contenido; acción principal próxima al trabajo que resuelve.
- Mantener una sola entrada para cada acción. Búsqueda, local, canal y fecha usan sus controles del header; no repetir una barra completa de filtros en el cuerpo. Un botón `+` debe indicar qué crea en esa vista.
- En rutas raíz, conservar la navegación móvil vigente mediante hamburguesa; en detalle, usar Volver y el origen real. La existencia de `BottomNav` en el código no autoriza reinstalar una barra inferior. Tablet puede usar sidebar sin comprimir el teléfono para parecer un escritorio.
- Objetivos táctiles de al menos 44 px para controles de acción. Resolver títulos largos con `min-width: 0`, distribución y truncado intencional; no achicar todos los textos para hacerlos caber. Datos esenciales deben seguir consultables.
- Respetar safe areas superior e inferior, teclado y botones del sistema. Definir un propietario del scroll: `IonContent` en teléfono o el contenedor que ya administra la vista. Evitar scrolls anidados y acciones tapadas por teclado o footer.
- Mantener transiciones que preserven orientación. Usar las primitivas de navegación existentes y respetar movimiento reducido. No corregir un hueco negro añadiendo otra animación, un timeout arbitrario o un spinner permanente.

## Componentes, formularios y estados

- Compartir tarjetas, encabezados, compositores y hojas de detalle. Dar profundidad sólo para separar superficies o expresar interacción; no envolver cada dato en una tarjeta decorativa.
- Cada vista distingue carga inicial, datos, vacío, búsqueda sin resultados, error y alcance sin asignar. Un fallo de red no equivale a cero ventas ni a una lista vacía. Una cuenta sin marca o local necesita una explicación, no una pantalla negra.
- Vacíos: decir qué falta y cuál es el próximo paso permitido. En reparto, distinguir sin pedidos asignados, sin pedidos elegibles para recogida y fuera de horario cuando el contrato lo permita; no prometer asignación automática ni mostrar tracking activo sin confirmación.
- Durante una mutación, impedir envíos duplicados y mostrar estado pendiente en la acción afectada. Confirmar éxito y avance con el resultado del servicio; conservar una forma de reintentar sin perder contexto.
- Campos con label visible, error próximo al campo y teclado acorde al dato. Cantidades permiten borrar todo mientras se edita; validar al confirmar. Teléfono, documento y código son identificadores, no cantidades.
- Contraseña y restauración de sesión son estados diferentes. Un 401 de refresh al cargar el login puede significar que no hay sesión, no contraseña incorrecta. No convertirlo en error del formulario ni ocultar indiscriminadamente errores de red/servidor.
- Usar traducciones en `src/i18n/locales/`; comprobar los idiomas realmente disponibles. Foco visible, nombres accesibles para iconos, estado no dependiente sólo del color y contraste legible en claro/oscuro.

## Roles sin experiencias duplicadas

Derivar módulos y acciones de `navigationAccess`, capacidades y alcance vigentes. Compartir presentación para roles autorizados, conservando la experiencia específica de motorizado y RIDER. Un cambio visual no crea permisos ni amplía marcas, locales, pedidos o acceso a ubicación. Consultar la referencia de roles antes de cambiar destinos o menús.

## Verificar el resultado

### Trabajar pantalla por pantalla

Inspeccionar primero la pantalla elegida y su flujo de entrada/salida, identificar qué elementos compartidos reutiliza y aplicar los cambios en ese alcance. Verificar la pantalla y un consumidor representativo si cambió un componente común antes de pasar a otra. Registrar aquí sólo decisiones reutilizables y confirmadas; una excepción local no se convierte en una regla global. No extender un rediseño a otras pantallas por iniciativa propia.

- Inspeccionar la pantalla real antes y después al mismo ancho. Revisar el estado afectado, texto largo, teclado, overlay/hoja y Volver. Si cambia un componente compartido, revisar otro consumidor representativo.
- Para rutas o sesión, probar acceso directo, login, recarga, salir/entrar, ida/vuelta a detalle y Android Back cuando se disponga de dispositivo. Que la URL cambie no prueba que Ionic muestre la página correcta.
- Para comportamiento, ejecutar tests existentes pertinentes y agregar una regresión observable cuando se corrija un fallo. Ajustes locales de espaciado no requieren tests que repitan CSS. Typecheck y build según el alcance; distinguir deuda previa de nuevas regresiones.
- Usar datos de demostración para capturas; no modificar pedidos reales sólo para obtener una imagen. La inspección en navegador no demuestra GPS en segundo plano, impresión o captura de pagos nativos.
- Entregar qué cambió, cómo se comprobó y qué queda pendiente. No afirmar que está en Play por funcionar en localhost.

Esta skill guía diseño e implementación; no autoriza despliegues, publicación, cambios de permisos o creación de cuentas. Mantener `develop` como rama de integración según las instrucciones del repositorio.
