# Publicación automática de Android

El workflow `google-play-production.yml` valida los PR hacia develop/main y, una vez activado, publica cada push de main en el canal **production** de `com.agiliza360.mobile`. Google conserva la revisión y aprobación de cada versión. No publica el sitio web ni otros servicios.

## Desarrollo y producción

El `.env` de la raíz sigue siendo local, ignorado por Git y no se modifica. Puedes conservar sus bloques comentados y las direcciones LAN/emulador. CI suministra las variables VITE por entorno de proceso, con prioridad sobre `.env`: backend y socket ssgg-production, tracker tradingtracker-back-prod-production y mocks desactivados. No hace falta crear otro `.env` ni generar varias variantes del AAB.

En cada publicación se genera un único AAB firmado, se verifica su firma y sus endpoints/URLs legales, se conserva como artifact durante 14 días y se envía a Play. `versionCode` es `10000 + GITHUB_RUN_NUMBER * 100 + GITHUB_RUN_ATTEMPT`: cambia también al reintentar. No renombrar/recrear el workflow ni publicar manualmente códigos superiores sin ajustar la fórmula. Los builds locales conservan versionCode 1 salvo que se pase `-PreleaseVersionCode=...`.

## Configuración inicial (una sola vez)

1. Completar la ficha y las declaraciones de contenido, privacidad, acceso y seguridad de datos de Play Console. Subir el primer AAB desde la consola para registrar el paquete y completar el primer lanzamiento. No usar el AAB antiguo de develop.
2. En un proyecto de Google Cloud, habilitar Google Play Android Developer API y crear una cuenta de servicio dedicada a publicar esta app. No requiere un rol general de administrador de Cloud. En Play Console, invitarla con acceso solo a Agiliza360, lectura y publicación de versiones en producción (no administración de usuarios ni pagos).
3. Configurar Workload Identity Federation para GitHub, con emisor `https://token.actions.githubusercontent.com`. Limitar la condición del proveedor a `assertion.repository_id == '1326965001' && assertion.ref == 'refs/heads/main' && assertion.sub == 'repo:cesardeveloper1@274036212/panel-admin-ag360ai-movile@1326965001:environment:production'`. Mapear `google.subject=assertion.sub`, `attribute.repository_id=assertion.repository_id` y `attribute.ref=assertion.ref`. Autorizar `roles/iam.workloadIdentityUser` en la cuenta de servicio solo a ese mismo subject. Este repositorio emite subjects con IDs inmutables; no usar el formato antiguo sin IDs. No crear ni guardar una clave JSON permanente.
4. Crear el environment de GitHub `production`, limitado a main. Si se desea publicación sin intervención, no añadir una aprobación manual obligatoria a este environment.
5. Guardar en ese environment los secretos `ANDROID_UPLOAD_KEYSTORE_BASE64`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`, usando la misma clave de carga ya registrada en Play. No imprimir valores ni subir `android/signing` al repositorio.
6. Crear allí las variables `GOOGLE_PLAY_WORKLOAD_IDENTITY_PROVIDER` (nombre completo del proveedor) y `GOOGLE_PLAY_SERVICE_ACCOUNT` (correo de la cuenta de servicio).
7. Al terminar el primer lanzamiento y comprobar los permisos, establecer la variable **de repositorio** `PLAY_AUTO_PUBLISH_ENABLED=true`. Hasta entonces solo se valida el código web; no se genera ni se envía ningún AAB. El siguiente push a main o la ejecución manual desde main inicia la publicación.

Para comprobar la conexión antes de generar el AAB, ejecutar manualmente `Verify Google Play access` desde main. Obtiene credenciales temporales por OIDC, lee los detalles y canales de la app dentro de una edición temporal y la descarta sin publicar. No utiliza la clave de carga ni compila Android.

Los pushes se serializan para no editar Play simultáneamente. GitHub puede sustituir ejecuciones pendientes por el push más reciente; ese commit contiene los cambios anteriores. Para detener publicaciones nuevas, quitar `PLAY_AUTO_PUBLISH_ENABLED` o ponerla en false. No cancela una versión ya enviada a Google.

## Referencias

- [Acceso oficial a Google Play Developer API](https://developers.google.com/android-publisher/getting_started)
- [Estados de versiones y canales](https://developers.google.com/android-publisher/tracks)
- [Acción de carga, autenticación federada y primer paquete](https://github.com/r0adkll/upload-google-play)
