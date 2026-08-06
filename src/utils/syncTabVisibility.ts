import { getRoute, pageMatchesRoute } from '../navigation/appRouteRegistry';

/**
 * Ionic a veces deja el hijo (Productos) visible tras navegar a un tab.
 * Fuerza qué ion-page del outlet debe mostrarse según pageMarker del registry.
 */
export function syncTabVisibility(path: string) {
  if (!getRoute(path)?.pageMarker) return;

  const outlet = document.querySelector('ion-router-outlet');
  if (!outlet) return;

  outlet.querySelectorAll(':scope > .ion-page').forEach((page) => {
    const el = page as HTMLElement;
    const show = pageMatchesRoute(page, path);
    el.classList.toggle('ion-page-hidden', !show);
    if (show) {
      el.removeAttribute('aria-hidden');
      el.style.removeProperty('display');
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
  });
}
