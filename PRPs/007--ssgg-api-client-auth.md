# PRP: Cliente API + auth JWT contra ssgg

> **Project:** agiliza360-mobile  
> **Version:** 1.0  
> **Created:** 2026-08-08  
> **Status:** Completed  
> **Depends on:** `ssgg` PRP [200--mobile-admin-cors-origins](../../ssgg/PRPs/200--mobile-admin-cors-origins.md) (CORS Capacitor; Vite puede ir con proxy)  
> **Branch target:** `develop`  
> **Epic:** [Conexión a ssgg](./README-ssgg-connection.md)  
> **Next:** [008--ssgg-brands-orders](./008--ssgg-brands-orders.md)  
> **Hermano backend:** `ssgg/PRPs/200--mobile-admin-cors-origins.md`

---

## Implementation notes (Completed 2026-08-08)

- `src/config/env.ts` + `.env` / `.env.example` (`VITE_API_BASE_URL`, `VITE_USE_API_MOCK`, proxy target).
- `src/services/api.ts`, `authService.ts`, `apiFacade.ts`; token en `auth_token`.
- Vite proxy `/api/v3` + `/socket.io` → `VITE_DEV_BACKEND_URL`.
- `AppContext` login/logout vía facade; 401 → `notifySessionExpired`.
- LoginPage: error `auth.loginFailed`; mock prefill solo si `VITE_USE_API_MOCK=true`.
- Brands/orders siguen en `apiMock` (008).

---

## Goal

Que el móvil pueda **iniciar sesión real** contra `ssgg` (`POST /auth/signin`), persistir JWT y hacer requests autenticados con el mismo envelope que el panel web — sin tocar aún marcas/órdenes reales (siguen mock hasta 008).

Estado final:

1. Existe capa `src/services/api.ts` + `src/config/env.ts`.
2. Vite proxy `/api/v3` y `/socket.io` → backend local en development.
3. `AppContext.login` / `logout` usan auth real cuando mock está off.
4. Flag `VITE_USE_API_MOCK` permite demos offline.

---

## Why

- Hoy `apiMock.login` acepta cualquier password; no hay token ni `Authorization`.
- Sin cliente HTTP no se puede validar CORS ni el resto del epic.
- Reutilizar el patrón del panel web evita un segundo contrato.

---

## What

### User-visible

1. Login con email/password de un usuario real de `ssgg` → sesión OK (nombre/rol desde respuesta o JWT).
2. Credenciales inválidas → error claro (no “toast.loginOk”).
3. Logout limpia token y sesión.
4. Con `VITE_USE_API_MOCK=true`, comportamiento demo actual se mantiene.

### Technical

1. **Env**
   - `VITE_API_BASE_URL` — browser/dev preferido: `/api/v3`; device: `http://<host>:3002/api/v3`
   - `VITE_SOCKET_BASE_URL` — base sin path API (para 009+); puede quedar sin uso en 007
   - `VITE_DEV_BACKEND_URL` — target proxy (default `http://127.0.0.1:3002`)
   - `VITE_USE_API_MOCK` — `'true'` | `'false'` (default: `'true'` hasta que 007+008 estén estables en el equipo; documentar flip a false)

2. **`src/services/api.ts`** — fetch wrapper inspirado en panel web:
   - `Authorization: Bearer ${localStorage.auth_token}`
   - Métodos get/post/put/patch/delete
   - 401 en rutas no públicas → limpiar sesión / forzar re-login
   - No depender de Sentry del panel (omitir o stub mínimo)

3. **`src/services/authService.ts`** — `login` → `POST /auth/signin`; mapear respuesta a `UserSession`.

4. **`vite.config.ts`** — proxy development como panel:

   ```ts
   '/api/v3' → VITE_DEV_BACKEND_URL
   '/socket.io' → same, ws: true
   ```

5. **`AppContext`** — si mock off: `authService.login`; guardar `auth_token` (+ rol); logout remueve keys.

6. **`.env.example`** en el repo móvil (sin secretos).

### Success Criteria

- [x] Con ssgg local y mock off, login válido obtiene token y `session` no null
- [x] Request autenticado de prueba (ej. `GET /auth/system/info` o ping documentado) envía Bearer
- [x] Login inválido no setea sesión; UI muestra fallo
- [x] Logout elimina `auth_token` y sessionStorage de sesión
- [x] Con `VITE_USE_API_MOCK=true`, login demo sigue funcionando
- [x] Proxy Vite: en browser, Network muestra same-origin `/api/v3/...`
- [x] `npm run lint` + `npx tsc --noEmit` / build OK
- [x] No se cablean aún `getOrders` / `getBrands` reales (eso es 008)

### Out of scope

- Mappers de órdenes/marcas (008)
- Socket.IO
- Capacitor Preferences (localStorage basta en v1; Preferences opcional)
- Cambios en `ssgg` salvo consumir CORS de 200

---

## All Needed Context

### Documentation & References

```yaml
- file: AGENTS.md
  why: mobile-first; develop

- file: src/context/AppContext.tsx
  why: login/logout actuales vía apiMock

- file: src/services/apiMock.ts
  why: contrato login → UserSession a preservar en la fachada

- file: src/pages/LoginPage.tsx
  why: UI login

- file: src/types/index.ts
  why: UserSession

- file: vite.config.ts
  why: añadir proxy

- file: ../panel-admin-ag360ai/src/services/api.ts
  why: patrón fetch + Bearer + PUBLIC_AUTH_ENDPOINTS

- file: ../panel-admin-ag360ai/src/services/authService.ts
  why: POST /auth/signin

- file: ../panel-admin-ag360ai/src/config/env.ts
  why: VITE_API_BASE_URL

- file: ../ssgg/docs/cors.md
  why: orígenes; Capacitor

- file: ../ssgg/PRPs/200--mobile-admin-cors-origins.md
  why: hermano CORS

- file: .cursor/skills/dev-ngrok-vite-local-backend/SKILL.md
  why: patrón proxy Vite (en monorepo Negocio) — adaptar puertos del móvil
```

### Current Codebase Structure

```bash
src/
├── context/AppContext.tsx    # apiMock.login
├── services/apiMock.ts       # único “API”
├── pages/LoginPage.tsx
└── types/index.ts
vite.config.ts                # sin proxy
# sin .env.example / config/env
```

### Desired Structure

```bash
src/
├── config/env.ts             # VITE_* tipado
├── services/
│   ├── api.ts                # fetch + Bearer
│   ├── authService.ts        # signin
│   ├── apiFacade.ts          # (opcional) elige mock vs real
│   └── apiMock.ts            # se mantiene
├── context/AppContext.tsx    # usa facade/authService
└── vite-env.d.ts             # ImportMetaEnv
.env.example
vite.config.ts                # proxy /api/v3 + /socket.io
```

### Known Gotchas

```ts
// CRITICAL: prefijo global ssgg = api/v3 (paths del cliente sin repetir host)
// CRITICAL: envelope { success, data } / StdApiResponse — no asumir data plano
// CRITICAL: en emulador Android, localhost ≠ host PC → 10.0.2.2 o proxy no aplica igual
// CRITICAL: Capacitor Origin distinto → necesita ssgg 200
// PATTERN: PUBLIC_AUTH_ENDPOINTS incluyen /auth/signin
// GOTCHA: panel web usa localStorage auth_token / user_role — reutilizar nombres facilita debug
```

---

## Implementation Blueprint

### Data Models / Types

```ts
// Mapear respuesta signin (campos reales del panel) → UserSession
interface UserSession {
  email: string;
  nameKey?: string;
  displayName?: string;
  initials: string;
  role: string;
  brandId?: string;
}
```

### Tasks

```yaml
Task 1: Env + types Vite
  - ADD: src/config/env.ts
  - ADD: .env.example
  - MODIFY: src/vite-env.d.ts (ImportMetaEnv)

Task 2: api.ts + authService
  - ADD: src/services/api.ts (simplificado vs panel; sin Sentry obligatorio)
  - ADD: src/services/authService.ts
  - PATTERN: panel-admin-ag360ai/src/services/api.ts

Task 3: Vite proxy
  - MODIFY: vite.config.ts con loadEnv + proxy /api/v3 y /socket.io

Task 4: Facade + AppContext
  - ADD o MODIFY: capa que si VITE_USE_API_MOCK → apiMock.login else authService
  - MODIFY: AppContext login/logout + storage token
  - PRESERVE: UX toasts / authEpoch / clearBrand en login

Task 5: LoginPage errores
  - MODIFY: mostrar mensaje si login false / throw
```

### Pseudocode

```ts
async function login(email: string, password: string) {
  if (env.useApiMock) return apiMock.login(email, password);

  const res = await api.post('/auth/signin', { email, password });
  const token = extractToken(res); // según shape real del panel
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user_role', role);
  return mapToUserSession(res);
}
```

### Integration Points

```yaml
ENV: VITE_API_BASE_URL, VITE_USE_API_MOCK, VITE_DEV_BACKEND_URL
CONTEXT: AppContext.login / logout
STORAGE: auth_token, user_role; session keys existentes ag360-*
BACKEND: POST /api/v3/auth/signin
```

---

## Validation Loop

### Level 1

```bash
npm run lint
npx tsc --noEmit
```

### Level 2

```bash
npm run test.unit -- --run
```

### Level 3 — Manual

```bash
# Terminal A: ssgg en :3002
# Terminal B:
npm run dev
# .env.local: VITE_USE_API_MOCK=false, VITE_API_BASE_URL=/api/v3
# Login con usuario real → Network: POST /api/v3/auth/signin 200 + token
# Logout → auth_token ausente
# VITE_USE_API_MOCK=true → demo sigue OK
```

---

## Final Checklist

- [x] lint + tsc/build OK
- [x] Mock flag documentado en `.env.example`
- [x] No regresiones de navegación Ionic
- [x] Cross-link epic / ssgg 200
- [x] 008 no bloqueado (token listo)

---

## Anti-Patterns to Avoid

- ❌ Hardcodear `http://localhost:3002` en componentes
- ❌ Copiar Sentry/Mixpanel del panel “porque sí”
- ❌ Sustituir todo `apiMock` en este PRP
- ❌ Guardar password en storage
- ❌ Ignorar envelope y castear `response` a UserSession a ciegas
