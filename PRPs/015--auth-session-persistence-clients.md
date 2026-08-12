# PRP: Restauración segura de sesión — web y móvil

> **Project:** panel-admin-ag360ai-movile
> **Version:** 1.1
> **Created:** 2026-08-10
> **Status:** Web/PWA and native Capacitor secure storage implemented — pending device integration validation
> **Pattern:** B (autenticación multi-cliente)

## 1. Project Overview

Integrar renovación silenciosa y almacenamiento seguro para que recargar la aplicación móvil conserve la sesión. El panel web tiene un PRP independiente en su propio repositorio.

## 2. Problem Statement

El móvil usa `localStorage` para `auth_token`, rol y datos de usuario. La recarga puede restaurar la sesión, pero un script inyectado puede leer el JWT. El cliente tampoco tiene un flujo explícito de bootstrap/refresh antes de renderizar rutas protegidas.

## 3. Success Criteria

- [ ] Recargar una ruta protegida conserva la sesión si existe refresh válido.
- [ ] Nunca se persiste el access token en `localStorage`.
- [ ] Web usa cookie HttpOnly cuando el backend lo permita.
- [ ] Capacitor usa Keychain/Keystore mediante un adaptador; la PWA no finge tener almacenamiento seguro nativo.
- [ ] Expiración o revocación redirige a `/login` una sola vez y limpia estado local.
- [ ] Peticiones concurrentes comparten una única promesa de refresh.

## 4. User Stories (Jobs-to-be-Done)

- Cuando cierro y vuelvo a abrir el panel, quiero seguir trabajando sin repetir login.
- Cuando uso un teléfono perdido o comprometido, quiero que una sesión revocada no pueda reactivarse.
- Como agente, quiero que una caída breve de red no me expulse innecesariamente.

## 5. Functional Requirements

### P0

- FR-001: Crear un `authSessionManager` con estados `unknown`, `restoring`, `authenticated`, `anonymous`.
- FR-002: Al arrancar, intentar `refresh` antes de resolver rutas protegidas.
- FR-003: Mantener el access token solo en memoria y adjuntarlo a requests.
- FR-004: En 401, ejecutar refresh una sola vez; reintentar la petición original una vez y evitar bucles.
- FR-005: Si refresh falla, limpiar sesión, caché sensible y notificar expiración.
- FR-006: Web: no leer/escribir refresh token desde JavaScript; usar cookie HttpOnly.
- FR-007: Capacitor: implementar adaptador de almacenamiento seguro con Keychain/Keystore y fallback explícito solo para entorno de desarrollo.
- FR-008: Logout llama al backend y después limpia memoria, marca seleccionada y datos de sesión.
- FR-009: En `localhost`, restaurar la sesión después de reload usando el flujo de refresh de desarrollo; el fallback local solo podrá activarse con una bandera explícita de desarrollo y nunca en builds de producción.

### P1

- FR-009: Coordinar refresh entre pestañas mediante `BroadcastChannel`/evento storage sin compartir tokens.
- FR-010: Mostrar estado no bloqueante de restauración; preservar skeleton/ruta mientras se valida.
- FR-011: Inactividad configurable y cierre automático solo después de expiración/revocación, no por reload.

## 6. Non-Functional Requirements

- NFR-001: No access token, refresh token, contraseña ni respuesta de signin en logs.
- NFR-002: El bootstrap debe resolver normalmente en menos de 1 s con red disponible y no bloquear la UI más allá del estado de restauración.
- NFR-003: Reintentos limitados, backoff breve y cancelación al desmontar.
- NFR-004: Tests cubren refresh concurrente, reload, 401, logout y multi-tab.
- NFR-005: Cumplir safe-area y no mostrar datos privados antes de validar sesión.

## 7. Technical Constraints

- Reemplazar la lectura directa actual de `src/utils/authSession.ts` sin romper `api.ts` ni `AppContext`.
- Mantener `config.useApiMock` con una implementación equivalente para desarrollo.
- Respetar Ionic React Router y `onSessionExpired`.
- El cliente móvil debe detectar Capacitor de forma fiable; no usar `localStorage` como almacén permanente del token en producción.
- En `localhost`, permitir cookie de refresh sin `Secure` únicamente en entorno de desarrollo controlado, o documentar HTTPS local; producción siempre exige HTTPS y `Secure`.
- Las peticiones cross-origin de desarrollo deben usar `credentials: include` y una allowlist de orígenes, nunca `*` con credenciales.

## 8. Data Requirements

- Memoria: access token, expiración y `UserSession` actual.
- Persistencia web: cookie gestionada por navegador; solo preferencias no sensibles en localStorage.
- Persistencia nativa: identificador/refresh token en secure storage.
- No persistir `Authorization` ni respuestas completas de usuario si no es necesario.

## 9. UI/UX Requirements

- Reload en ruta protegida: mostrar una restauración breve y continuar en la misma ruta.
- Refresh fallido: regresar a login y mostrar “Tu sesión expiró. Inicia sesión nuevamente.”
- Evitar flash de la pantalla de login cuando el refresh todavía está en curso.
- Logout siempre visible y con confirmación solo si existe trabajo no enviado.

## 10. Risks & Assumptions

- Riesgo: cookie bloqueada por dominios distintos. Mitigar documentando same-site, CORS y `credentials: include`.
- Riesgo: plugin secure storage ausente en PWA. Mitigar con build target explícito y no almacenar el token persistente en localStorage.
- Riesgo: confundir el fallback de `localhost` con una solución para producción. Mitigar con validación de entorno en build y pruebas que fallen si se habilita fuera de desarrollo.
- Riesgo: listeners duplicados en AppContext. Mitigar con provider único y cleanup.
- Supuesto: el PRP 014 entrega `/auth/refresh` y `/auth/logout` compatibles.

## 11. Out of Scope

- Rediseñar login.
- MFA, SSO o biometría como factor de autenticación.
- Sincronización offline de mensajes.
- Cambiar la política de roles.

## 12. Open Questions

- Resuelto: se distribuye como Capacitor para Android/iOS y también como navegador/PWA.
- ¿El frontend web y backend comparten site para usar cookie HttpOnly sin proxy?
- Resuelto: se incorporó `@aparajita/capacitor-secure-storage` 8.0.0 (MIT), compatible con Capacitor 8.
- Resuelto: el refresh restaura automáticamente la marca seleccionada.

## 13. Decisiones aprobadas

- **Targets:** navegador/PWA y Capacitor Android/iOS.
- **Persistencia nativa:** Keychain/Keystore mediante plugin seguro OSS; no usar `localStorage` ni `@capacitor/preferences` para refresh tokens.
- **Restauración:** conservar automáticamente la marca seleccionada después de reload/refresh.
- **Límite de sesiones:** máximo 6 sesiones activas por usuario; al crear la séptima se revoca la más antigua.
- **Fallback localhost:** permitido únicamente en desarrollo explícito y nunca en builds de producción.

## Implementation Blueprint

### Files likely to change

```yaml
- panel-admin-ag360ai-movile/src/utils/authSession.ts: manager y compatibilidad de logout/expiry.
- panel-admin-ag360ai-movile/src/services/api.ts: credentials, refresh single-flight y retry 401.
- panel-admin-ag360ai-movile/src/context/AppContext.tsx: bootstrap antes de rutas y estado restoring.
- panel-admin-ag360ai-movile/src/App.tsx: guard de rutas durante restoring.
- panel-admin-ag360ai-movile/src/services/apiMock.ts: contrato mock de refresh/logout.
```

## 14. Addendum v1.1 — identidad por navegador e instalación

### Web/PWA

- Generar `clientInstanceId` con `crypto.randomUUID()` en el primer arranque y conservarlo en `localStorage` o IndexedDB. No es secreto ni reemplaza al refresh token.
- Enviar `clientInstanceId` en signin y refresh según el contrato de `ssgg` (header `X-Client-Instance` recomendado).
- Usar `BroadcastChannel` para que una sola pestaña rote el refresh token y las demás reciban señal de éxito/fallo sin transferir tokens; usar `storage` como fallback.
- Incógnito, otro perfil o borrar datos del sitio es una instancia nueva.

### Capacitor

- Generar un `clientInstanceId` por instalación y guardarlo con Keychain/Keystore junto al refresh token; no usar `localStorage` ni Preferences para el refresh token.
- Reinstalar o eliminar almacenamiento seguro puede crear una nueva instancia; no fingerprint de hardware.
- Incluir el mismo ID en signin, refresh y logout.

### Contrato y validación

- El backend mantiene un único documento por `{ userId, clientInstanceId }`; reload/rotación actualiza ese documento.
- Mantener un máximo de seis instancias activas por usuario; la séptima revoca la menos usada.
- Probar: reload no aumenta sesiones, dos pestañas comparten sesión, PWA/incógnito crea otra y Android/iOS conserva ID tras reinicio.

### Validation Loop

```bash
npx tsc --noEmit
npm run test.unit -- --run
npm run build
```

Manual: login y reload en `http://localhost`, refresh con backend en otro puerto, CORS con credentials, access token expirado, dos requests simultáneos con 401, logout, revocación backend, incógnito, PWA y Capacitor.
