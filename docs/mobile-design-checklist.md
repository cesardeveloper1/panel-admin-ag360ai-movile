# Consolidación del diseño móvil

Actualizado: 30 de octubre de 2026. Alcance: owner, manager, worker, motorizado y RIDER; plataforma de superadmin fuera de esta pasada.

## Pantallas principales trabajadas

Login conservado por decisión del usuario; bienvenida, Agilito, Operaciones, listado de Chats, Reportes, Negocio, Productos, Clientes, Locales, Datos de marca, Perfil, Alertas, Captura de pagos, Impresoras, Despacho, Viaje RIDER, Repartidores, Zonas, Grupos, Cuenta del motorizado listado de Entregados Mensajes rápidos y onboarding.

Trabajada no significa publicada ni validada de extremo a extremo. Onboarding conserva su integración legacy con apiMock: la persistencia real del agente queda pendiente. Flota se revisó con componentes reales aislados y pruebas. Entregados muestra únicamente los registros ya cargados, no una consulta histórica completa. Captura e impresión requieren dispositivo.

## Pantallas aún sin pasada dedicada


### Pantallas secundarias configuradas en STAFF_SCREENS

- [ ] Configuración de reservas — `/app/reservations/config`
- [ ] Órdenes — `/app/reports/orders`
- [ ] Ventas por integración — `/app/reports/integration-sales`
- [ ] Mapa de órdenes — `/app/reports/order-map`
- [ ] Cierre de caja — `/app/reports/cash-close`
- [ ] Órdenes canceladas — `/app/reports/cancelled`
- [ ] Categorías — `/app/menu/categories`
- [ ] Modificadores — `/app/menu/modifiers`
- [ ] Agrupadores — `/app/menu/groups`
- [ ] Integraciones de menú — `/app/menu/integrations`
- [ ] Carta digital — `/app/menu/digital` (enlace externo; revisar acceso)
- [ ] Configuración por local — `/app/menu/local`
- [ ] Plantillas — `/app/marketing/templates`
- [ ] Campañas — `/app/marketing/campaigns`
- [ ] Reclamos — `/app/marketing/complaints`
- [ ] Encuesta del local — `/app/marketing/branch-survey`
- [ ] Zonas de cobertura — `/app/locations/zones`
- [ ] Galería — `/app/locations/gallery`
- [ ] Integraciones del local — `/app/locations/integrations`
- [ ] Agilink — `/app/agilink`
- [ ] Tutoriales — `/app/help`

## Detalles, formularios y estados pendientes

- [x] Conversación y compositor: burbujas con texto largo, tokens, controles de 44 px, foco, emojis y etiquetas accesibles. Vista aislada a 360/390 px y 3 pruebas del compositor (fallo/reintento, envío pendiente, cambio de chat).
- [ ] Chat: validar en Android teclado, adjuntos/audio reales, mensajes rápidos e historial completo; la vista aislada no demuestra envío ni recepción del proveedor.
- [x] Detalle de pedido (OrderDetailSheet): jerarquía de cliente/estado, entrega, productos, notas y total; controles de 48 px, tokens y texto adaptable. Vista aislada a 360/390 px y 3 pruebas existentes de fallo/reintento y cierre tras confirmación.
- [ ] Detalle de pedido: validar hoja Ionic completa, scroll con muchos productos y Android Back en dispositivo, conservando permisos por rol.
- [x] Alta de producto: hoja Ionic real a 360/390 px, campos de 48 px, acciones fuera del scroll, disponibilidad accesible y aviso sin categorías; 3 pruebas de validación, borrador y estado pendiente. Sin crear productos reales.
- [ ] Alta de producto: validar teclado y cierre por Android Back en dispositivo.
- [x] Alta/edición de local: patrón compartido de campos y acciones, nombres accesibles, estado pendiente y conservación del borrador al refrescar el mismo local. Hoja Ionic real a 360/390 px con datos de prueba; 3 pruebas del local y 3 del formulario de producto compartido. Sin guardar locales reales.
- [ ] Locales: validar teclado y Android Back en dispositivo.
- [ ] Alta de marca y edición de producto: revisión completa; abrir los formularios no equivale a rediseñarlos.
- [ ] Configuración y lista de reservas, incluida su presentación por rol.
- [ ] Editor de polígonos y flujo completo de edición de zonas.
- [ ] Editor y guardado de grupos de WhatsApp con locales reales autorizados.
- [ ] Formularios de cuenta del partner y preferencias de idioma.
- [ ] Confirmaciones de cierre de sesión y eliminación de cuenta: revisión visual sin ejecutar eliminación real.

## Verificación pendiente, distinta del diseño

- [ ] Revisar con cuentas owner, manager y worker según sus permisos y locales.
- [ ] Recorrer despacho, repartidores, zonas, grupos y cuenta con un motorizado real.
- [ ] Recorrer espera/recogida/en ruta/entrega con un RIDER de prueba, sin modificar pedidos reales para capturas.
- [ ] GPS, horarios, tracking y Android Back en dispositivo.
- [ ] Captura de pagos y conexión/impresión en Android/iOS según soporte real.
- [ ] Tema oscuro, teclado y textos largos en los flujos completos.
- [ ] Resolver los errores de TypeScript previos en OperationsQuickAccess.tsx y fleetTrip.test.ts.
