# PRP: Sesiones persistentes y seguras — backend

> **Project:** ssgg (contrato consumido por clientes Agiliza360)
> **Version:** 1.0
> **Created:** 2026-08-10
> **Status:** Draft
> **Pattern:** B (seguridad e integración de autenticación)

## 1. Project Overview

Definir el contrato backend de sesiones con access tokens cortos y refresh tokens rotativos. Este PRP especifica `ssgg`; cada frontend mantiene un PRP de integración en su propio repositorio.

## 2. Problem Statement

Los clientes persisten actualmente el JWT de acceso en almacenamiento del navegador. Esto conserva la sesión después de recargar, pero aumenta el impacto de un XSS o de un dispositivo compartido. Además, el backend debe ofrecer una renovación explícita para que el access token pueda expirar con seguridad.

## 3. Success Criteria

- [ ] `signin` entrega access token corto y refresh token opaco/rotativo, sin exponer secretos innecesarios en respuestas o logs.
- [ ] Un access token expirado puede renovarse una sola vez con un refresh token válido.
- [ ] La reutilización de un refresh token revocado invalida la familia de sesión.
- [ ] Logout, cambio de contraseña y revocación administrativa invalidan las sesiones correspondientes.
- [ ] Se conservan RBAC, throttling y el comportamiento actual de `JwtAuthGuard`.

## 4. User Stories (Jobs-to-be-Done)

- Cuando recargo el panel, quiero continuar autenticado sin volver a escribir mi contraseña.
- Cuando cierro sesión, quiero que esa sesión deje de funcionar inmediatamente.
- Como administrador, quiero revocar sesiones comprometidas sin afectar necesariamente a todos los usuarios.

## 5. Functional Requirements

### P0

- FR-001: Mantener `POST /auth/signin` compatible durante la migración y documentar el nuevo contrato.
- FR-002: Emitir access token con expiración corta configurable (recomendado 10–15 min).
- FR-003: Emitir refresh token de alta entropía, almacenado hasheado en backend; nunca guardar el valor plano.
- FR-004: Añadir `POST /auth/refresh` para rotar refresh token y emitir una nueva pareja.
- FR-005: Añadir `POST /auth/logout` para revocar el refresh token actual/familia solicitada.
- FR-006: Detectar reuse de refresh token: revocar la familia y responder 401 sin revelar el motivo sensible.
- FR-007: Asociar sesión a usuario, familia, dispositivo opcional, `createdAt`, `lastUsedAt`, `expiresAt`, `revokedAt` y hash/token id.
- FR-008: `me`, guards y endpoints protegidos deben seguir aceptando únicamente access tokens válidos.

### P1

- FR-009: Endpoint administrativo para listar/revocar sesiones del usuario con permisos adecuados.
- FR-010: Revocar todas las familias en cambio de contraseña y eventos de seguridad.
- FR-011: Cookies HttpOnly/Secure/SameSite para clientes web cuando el despliegue sea same-site; permitir body seguro para cliente móvil nativo si es necesario.

## 6. Non-Functional Requirements

- NFR-001: Refresh tokens nunca aparecen en logs, errores, analytics ni trazas.
- NFR-002: Comparaciones y hashes usan primitivas criptográficas de la plataforma; no JWT como refresh token salvo decisión documentada.
- NFR-003: Endpoints de signin/refresh/logout tienen rate limiting y respuestas genéricas.
- NFR-004: HTTPS obligatorio en producción; cookies `Secure` en producción.
- NFR-005: Revocación funciona en despliegues con más de una instancia usando almacenamiento compartido.
- NFR-006: Métricas sin PII: refresh exitoso, expirado, reuse detectado, revocado.

## 7. Technical Constraints

- Integrar con `ssgg/src/modules/auth`, `JwtAuthGuard`, estrategia JWT y entidades existentes.
- No romper consumidores actuales durante una migración gradual.
- Usar configuración por entorno para TTL, cookie flags, issuer/audience y límite de sesiones.
- Preferir una colección/repositorio de sesiones existente o crear uno con índice TTL y hash único.

## 8. Data Requirements

```ts
type AuthSession = {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  refreshTokenId: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokeReason?: string;
  userAgentHash?: string;
};
```

- Retener sesiones revocadas el tiempo necesario para detectar reuse y después purgarlas.
- No guardar contraseña, access token plano ni refresh token plano.

## 9. UI/UX Requirements

- El cliente debe poder restaurar sesión silenciosamente al abrir o recargar.
- Si refresh falla, mostrar sesión expirada y dirigir a login con mensaje claro.
- Logout debe ser una acción explícita y no depender de limpiar solo el almacenamiento local.

## 10. Risks & Assumptions

- Riesgo: CSRF si se usan cookies. Mitigar con SameSite, CSRF token cuando aplique y validación de origen.
- Riesgo: fuga del refresh token móvil. Mitigar con Keychain/Keystore, rotación y revocación por reuse.
- Riesgo: dos pestañas renuevan a la vez. Mitigar con coordinación cliente o endpoint idempotente de corta ventana.
- Supuesto: Mongo/almacenamiento compartido soporta índices TTL y consultas por hash.

## 11. Out of Scope

- SSO, MFA o recuperación completa de contraseña.
- Cambiar roles/permisos existentes.
- Persistir conversaciones offline.
- Guardar credenciales en `localStorage` como solución final.

## 12. Open Questions

- ¿El cliente móvil se distribuye como Capacitor nativo o solo PWA móvil?
- ¿Se requiere cerrar todas las sesiones al cambiar contraseña o solo la actual?
- ¿Cuál es el límite de sesiones simultáneas por usuario?
- ¿Qué almacenamiento compartido está disponible en producción para sesiones?

## Implementation Blueprint

### Files likely to change

```yaml
- ssgg/src/modules/auth/auth.controller.ts: refresh/logout y documentación.
- ssgg/src/modules/auth/auth.service.ts: emisión, rotación y revocación.
- ssgg/src/modules/auth/: nueva entidad/repositorio de sesiones y DTOs.
- ssgg/src/core/guards/jwt-auth.guard.ts: conservar access-token guard y errores.
- ssgg/src/config/: TTL, issuer, audience y flags por entorno.
```

### Validation Loop

```bash
npm run build
npm run test -- auth
```

Casos manuales: signin, recarga, refresh expirado, reuse del refresh, logout, cambio de contraseña, dos pestañas y dos dispositivos.
