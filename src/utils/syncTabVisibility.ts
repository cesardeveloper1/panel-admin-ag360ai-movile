import {
  AGILITO_PATH,
  CHATS_PATH,
  PAYMENTS_PATH,
} from '../navigation/navConfig';

const TAB_MATCHERS: Record<string, (page: Element) => boolean> = {
  [AGILITO_PATH]: (page) => !!page.querySelector('.agilito-layout'),
  [PAYMENTS_PATH]: (page) =>
    !!page.querySelector('.hub-grid') && !page.querySelector('.agilito-layout'),
  '/app/reports': (page) => !!page.querySelector('.reports-body'),
  '/app/operations': (page) => !!page.querySelector('.ops-body'),
  [CHATS_PATH]: (page) => !!page.querySelector('.chats-body'),
};

/**
 * Ionic a veces deja el hijo (Productos) visible tras navegar a un tab.
 * Fuerza qué ion-page del outlet debe mostrarse según la ruta.
 */
export function syncTabVisibility(path: string) {
  const match = TAB_MATCHERS[path];
  if (!match) return;

  const outlet = document.querySelector('ion-router-outlet');
  if (!outlet) return;

  outlet.querySelectorAll(':scope > .ion-page').forEach((page) => {
    const el = page as HTMLElement;
    const show = match(el);
    el.classList.toggle('ion-page-hidden', !show);
    if (show) {
      el.removeAttribute('aria-hidden');
      el.style.removeProperty('display');
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
  });
}
