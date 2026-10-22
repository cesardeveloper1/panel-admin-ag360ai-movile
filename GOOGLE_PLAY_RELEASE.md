# Google Play — Agiliza360

## Estado del 21 de octubre de 2026

- Aplicación creada en Play Console: https://play.google.com/console/u/1/developers/7875313616688227630/app/4974834700380218858/app-dashboard
- Paquete reservado: `com.agiliza360.mobile`.
- Versión Android: `1.0`, código `1`.
- Descripciones breve y completa guardadas como borrador en la ficha es-419.
- `npm run build`, `npx cap sync android` y `gradlew.bat bundleRelease` completados.
- AAB firmado generado: `android/app/build/outputs/bundle/release/app-release.aab`.
- Firma comprobada con `jarsigner -verify`.
- **No se ha subido el AAB ni enviado una versión a revisión.**

## Firma de subida

La clave local está en `android/signing/agiliza360-upload.p12` y la configuración en `android/signing/upload.properties`. Ambos archivos están excluidos de Git. Conservar una copia segura de esta carpeta: se necesita para firmar futuras actualizaciones. No publicar ni adjuntar los archivos de firma.

## Compilación

Usar Java 21. En esta máquina se encontró en `C:/Users/Dev1/.jdks/jbr-21.0.11`.

```powershell
npm run build
npx cap sync android
$env:JAVA_HOME = 'C:/Users/Dev1/.jdks/jbr-21.0.11'
Set-Location android
./gradlew.bat bundleRelease
```

La compilación actual usa el `.env` existente, que apunta a `https://ssgg-develop.up.railway.app`. El servicio público de ssgg en Railway es `https://ssgg-production.up.railway.app`. El AAB de la ficha debe compilarse contra ese servicio. No subir la compilación actual: también apunta el seguimiento de pagos al emulador `10.0.2.2:5000`, y ese tracker no tiene dominio en el proyecto Railway Agiliza360AI.

## Pendientes para publicar

- Recompilar el AAB contra `https://ssgg-production.up.railway.app` e incluir `@capacitor/browser`. No subir la compilación actual.
- Publicar la landing para que existan las URLs de privacidad y de eliminación. El código ya las tiene; el sitio en producción todavía no.
- La cuenta de revisión ya está en la base `ssgg-prod`, la misma que usan el panel y la app cuando apuntan a producción.
- Responsable confirmado: CARTA AI SAC, Cal. Los Ceibos Nro. 271, Urb. Miraflores, Castilla, Piura, Piura. Contacto: `soporte@agiliza360.ai`.
- Icono, gráfico de funciones 1024 × 500 y capturas reales de teléfono. La subida del icono no pudo verificarse.
- Subir el AAB nuevo, completar la versión y enviar a revisión cuando se resuelvan los requisitos. No se ha subido nada.

El informe de Play Console queda para otro paso: declaración de anuncios, formularios de contenido, público, seguridad de datos, gobierno, finanzas, salud, categoría y contacto de soporte. La aplicación no contiene anuncios.

## Privacidad y eliminación

URLs previstas, accesibles sin sesión cuando la landing de `develop` esté publicada:

- https://www.agiliza360.ai/privacidad
- https://www.agiliza360.ai/eliminar-cuenta

Azure Static Web Apps ya reescribe las rutas de la SPA a `index.html`, así que la URL directa funciona igual que `/planes`. El pie de la portada enlaza ambas. La app las abre desde el inicio de sesión y desde Configuración. La eliminación se pide por correo; la app no borra la cuenta sola.

## Cuenta de revisión

Creada el 21 de octubre de 2026 en la base `ssgg-prod`.

- Correo: `revision-play@agiliza360.ai`
- Contraseña: `Play-6ZyXnB5VmRJ7dz0q`
- Marca: `revision-play`

En Play Console, acceso para revisores: ese correo y esa contraseña. No hace falta un código de verificación. La revisión puede ver pedidos del día, la carta y una bandeja vacía. No debe esperar mensajes a clientes, Yape vinculado ni cobros reales.

El alta es idempotente. Crea o actualiza una marca etiquetada `play-review`, una sucursal, una carta, un cliente y un pedido ficticio ya entregado. El asistente queda apagado y bloqueado. No crea cuenta de mensajería, credenciales ni cobros. Si el subdominio `revision-play` ya existe sin esa etiqueta, o el correo ya tiene acceso a otra marca, se detiene sin cambiarlos.

Para volver a aplicarla en una base cuyo nombre contiene `prod`:

```bash
npm run provision:play-review -- --confirm-production
```
