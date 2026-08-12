# Preparación iOS

La plataforma iOS ya está generada en `ios/` y sincronizada con Capacitor 8.

## Requisitos en Mac

- macOS compatible con la versión de Xcode instalada.
- Xcode con el simulador iOS correspondiente.
- Apple Account añadida en Xcode.
- Apple Developer Program activo para TestFlight/App Store.

## Primer arranque

```bash
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

En Xcode:

1. Abrir el proyecto `ios/App/App.xcodeproj`.
2. Seleccionar el target `App`.
3. Confirmar el Bundle Identifier `com.agiliza360.mobile`.
4. Seleccionar el Team de Apple y activar la firma automática.
5. Elegir un simulador o iPhone y ejecutar.

## Publicación

Para TestFlight/App Store se debe crear el registro iOS en App Store Connect,
configurar certificados/provisioning y generar un Archive desde Xcode.

## Sesión segura

En iOS, el refresh token se almacena en Keychain mediante
`@aparajita/capacitor-secure-storage`. La sincronización con iCloud está
desactivada intencionalmente; el token queda asociado a este dispositivo.

La validación pendiente en un Mac/dispositivo real es: login, cierre y apertura,
refresh rotativo, logout y revocación de sesión.
