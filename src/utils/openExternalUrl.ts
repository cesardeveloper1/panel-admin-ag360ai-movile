import { Capacitor } from '@capacitor/core';

/**
 * Abre una página pública. En el navegador usa una pestaña nueva.
 * En Android e iOS usa el navegador del sistema cuando el plugin está disponible.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const browser = await import('@capacitor/browser');
    await browser.Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
