# PRP · Agilito en la app móvil

## 1. Proyecto

Conectar el chat existente de Agilito al mismo servicio que el panel web. Patrón C, integración de un sistema con IA. Entrega por hitos de contrato, integración y piloto. Usuarios del panel según sus permisos.

## 2. Problema

`src/pages/AgilitoPage.tsx` ya renderiza `/app/agilito` y simula respuestas con claves replyDefault, replyMenu y otras.

## 3. Criterios de éxito

El acceso actual abre el mismo Agilito. Los mensajes de texto reciben respuestas reales y las propuestas pueden confirmarse o cancelarse desde el teléfono.

## 4. Historia de usuario

Cuando uso Agilito desde el teléfono, quiero obtener ayuda y completar operaciones sin salir de la conversación.

## 5. Requisitos funcionales

Reemplazar la simulación de texto con el cliente autenticado de ssgg. Mantener los accesos por categoría, cabecera y ruta. Resolver enlaces con `src/navigation/appRouteRegistry.ts`, `navigationAccess.ts` y las reglas del negocio activo. Manejar fallas de red, reintentos y cambios de marca. Si existe transcripción utilizable, enviar el texto con la ruta de mensajes. Mientras la voz siga simulada, acordar una indicación honesta de disponibilidad para el piloto.

## 6. Requisitos no funcionales

Verificar teclado y áreas seguras, targets táctiles, foco, navegación atrás y reanudación. Evitar duplicados tras reconexión. Ignorar respuestas pendientes de una sesión anterior.

## 7. Restricciones técnicas

Aplicar `.claude/skills/agiliza-mobile-design/SKILL.md`. Reusar Ionic, AppShell, traducciones es/en y cliente de sesión existente. Integrar hacia develop conforme a AGENTS.md.

## 8. Datos

Aislar estado de chat por marca y sesión. Usar clientMessageId estable por envío, conversationId opaco y claves de navegación propias de móvil.

## 9. Experiencia de usuario

Mantener bienvenida «Pregúntale a Agilito», tarjetas y compositor existente. Mostrar propuesta con producto, alcance, moneda y precios. Confirmar y cancelar con controles accesibles. Mostrar error en línea y conservar el borrador recuperable.

## 10. Riesgos y supuestos

Validar el retorno desde una ruta sugerida y evitar que una respuesta tardía aparezca bajo otra marca. Verificar el comportamiento de micrófono actual antes de decidir el fallback del piloto.

## 11. Fuera de alcance

Nueva pantalla de soporte, transcripción nueva e historial sincronizado con web.

## 12. Preguntas abiertas

Móvil debe validar el contrato de voz actual y la lista de rutas por rol antes del piloto.

## Contrato compartido propuesto

Los clientes llaman a `ssgg` con su sesión habitual. El prefijo lógico propuesto es `/support/agilito` bajo el prefijo global de la API. Las rutas y los tipos se congelan entre los cuatro repos antes de implementar.

| Operación | Solicitud | Resultado |
| --- | --- | --- |
| Enviar mensaje | `POST /messages` con `clientMessageId`, `conversationId?`, `text`, `surface: web \| mobile`, `routeKey?` | `conversationId`, `messageId`, `text`, `links[]` y `proposal?` |
| Confirmar | `POST /proposals/:id/confirm` con `Idempotency-Key` | Estado `applied` y precio guardado, o error tipado |
| Cancelar | `POST /proposals/:id/cancel` | Estado `cancelled`, idempotente |

Cada enlace devuelve `routeKey` y etiqueta. Cada propuesta devuelve ID opaco, tipo `product.price.update`, nombre del producto, alcance, moneda, precio actual y nuevo, y vencimiento. El servidor deriva actor, marca y permisos de la sesión y el contexto autorizado. `surface` y `routeKey` solo orientan la respuesta. Importes según la representación del catálogo, sin cálculos con punto flotante en la confirmación. Usar el formato estándar de respuestas de `ssgg` y códigos de dominio estables para sesión inválida, acceso denegado, propuesta vencida, precio desactualizado y servicio temporalmente no disponible. Reintentar con los mismos identificadores.

## Orden y validación

1. Acordar el contrato entre los cuatro repositorios y publicar fixtures de éxito y error. Compañeros en `PRPs/PRP--agilito-soporte-panel.md` de ssgg, support-agent-aegis, panel-admin-ag360ai y panel-admin-ag360ai-movile.
2. Integrar primero texto y navegación. Luego habilitar propuestas y confirmación con productos de prueba.
3. Validar de extremo a extremo desde web y móvil. Preguntar dónde editar un producto y verificar el destino en cada superficie. Proponer S/ 25, cancelar y comprobar el precio anterior. Confirmar y comprobar el precio persistido, repetir con la misma clave y comprobar una sola escritura. Cubrir producto ambiguo, cambio de marca, rol sin permisos, conflicto y caída temporal de Aegis.
4. Ejecutar build y lint, y verificar el flujo en la UI con los escenarios del contrato. Habilitar el piloto por marca y por superficie con la capacidad de desactivar escrituras mientras el chat sigue disponible.

