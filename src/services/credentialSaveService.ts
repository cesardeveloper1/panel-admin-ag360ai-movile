/** Solicita al gestor de credenciales del sistema guardar el login.
 * WebView/Android decide si muestra el diálogo; si no es compatible no bloquea el login.
 */
export async function requestCredentialSave(email: string, password: string): Promise<void> {
  if (!email.trim() || !password || !('credentials' in navigator)) return;
  const CredentialCtor = (window as Window & {
    PasswordCredential?: new (input: { id: string; password: string }) => Credential;
  }).PasswordCredential;
  if (!CredentialCtor || typeof navigator.credentials.store !== 'function') return;
  try {
    await navigator.credentials.store(new CredentialCtor({ id: email.trim(), password }));
  } catch {
    // El gestor puede rechazar la solicitud o estar desactivado; el login ya fue exitoso.
  }
}
