import {
  getRoute,
  normalizePath,
  pageMatchesRoute,
} from '../navigation/appRouteRegistry';

/**
 * Alinea ion-pages del outlet con la ruta activa.
 * Usa data-ag-route (layouts) y si no, pageMarker del registry.
 * Evita dejar hijos “zombie” con ion-page-hidden que Ionic no revive.
 */
export function syncOutletVisibility(path: string) {
  const target = normalizePath(path);
  const outlet = document.querySelector('ion-router-outlet');
  if (!outlet) return;

  const pages = Array.from(
    outlet.querySelectorAll(':scope > .ion-page'),
  ) as HTMLElement[];
  if (!pages.length) return;

  const byRouteAttr = pages.filter(
    (page) => normalizePath(page.getAttribute('data-ag-route') || '') === target,
  );

  let showPages = byRouteAttr;
  if (!showPages.length) {
    // Tabs legacy / páginas sin data-ag-route
    if (!getRoute(target)?.pageMarker) return;
    showPages = pages.filter((page) => pageMatchesRoute(page, target));
    if (!showPages.length) return;
  }

  const showSet = new Set(showPages);
  pages.forEach((el) => {
    const show = showSet.has(el);
    el.classList.toggle('ion-page-hidden', !show);
    if (show) {
      el.removeAttribute('aria-hidden');
      el.style.removeProperty('display');
      el.style.removeProperty('opacity');
      el.style.removeProperty('z-index');
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
  });
}

/** @deprecated alias — mismos callers */
export function syncTabVisibility(path: string) {
  syncOutletVisibility(path);
}
