import { useCallback } from 'react';
import { useIonRouter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { blurActiveElement } from '../utils/navFocus';
import { fadeNavAnimation, instantNavAnimation } from '../utils/instantNavAnimation';
import { syncOutletVisibility } from '../utils/syncTabVisibility';
import { nextNavigationIntent, isCurrentNavigationIntent } from '../navigation/navigationIntent';
import { getTabRoots, normalizePath } from '../navigation/appRouteRegistry';

const TAB_ROOT_PATHS = getTabRoots();


function scheduleOutletSync(path: string, delayMs: number) {
  window.setTimeout(() => {
    if (normalizePath(window.location.pathname) === normalizePath(path.split('?')[0])) syncOutletVisibility(path.split('?')[0]);
  }, delayMs);
}

/**
 * Navega a un tab raíz. Si hay páginas hijas en el stack (Productos, etc.),
 * hace pop primero: root+replace de Ionic deja el hijo visible encima.
 */
function pushTabRoot(
  ionRouter: ReturnType<typeof useIonRouter>,
  path: string,
  instant = false,
) {
  const intent = nextNavigationIntent();
  const anim = instant ? instantNavAnimation : fadeNavAnimation;
  const current = window.location.pathname;
  const onChild = !TAB_ROOT_PATHS.has(current);

  if (`${current}${window.location.search}` === path) {
    scheduleOutletSync(path, 30);
    return;
  }

  // Pop only when returning from an app detail to a tab. Auth/fleet roots
  // must replace directly, never revisit a cached protected page on the way.
  if (onChild && current.startsWith('/app/') && TAB_ROOT_PATHS.has(path) && ionRouter.canGoBack()) {
    ionRouter.goBack(anim);
    window.setTimeout(() => {
      if (!isCurrentNavigationIntent(intent)) return;
      if (window.location.pathname !== path) {
        ionRouter.push(path, 'root', 'replace', undefined, anim);
      }
      scheduleOutletSync(path, 40);
      scheduleOutletSync(path, 160);
    }, instant ? 50 : 360);
    return;
  }

  ionRouter.push(path, 'root', 'replace', undefined, anim);
  scheduleOutletSync(path, instant ? 50 : 100);
}

export function useAppNavigation() {
  const ionRouter = useIonRouter();
  const history = useHistory();

  const goRoot = useCallback(
    (path: string, action: 'push' | 'replace' = 'replace', instant = false) => {
      void action;
      blurActiveElement();
      pushTabRoot(ionRouter, path, instant);
    },
    [ionRouter],
  );

  const go = useCallback(
    (path: string) => {
      blurActiveElement();
      if (TAB_ROOT_PATHS.has(path)) {
        pushTabRoot(ionRouter, path);
        return;
      }
      nextNavigationIntent();
      /**
       * Entrada a módulos: animación instantánea.
       * El fade + sync temprano ocultaba Pagos mientras el hijo aún tenía opacity 0 → negro.
       */
      ionRouter.push(path, 'forward', 'push', undefined, instantNavAnimation);
      scheduleOutletSync(path, 30);
      scheduleOutletSync(path, 120);
    },
    [ionRouter],
  );

  const replace = useCallback(
    (path: string) => {
      blurActiveElement();
      if (TAB_ROOT_PATHS.has(path)) {
        pushTabRoot(ionRouter, path);
        return;
      }
      nextNavigationIntent();
      ionRouter.push(path, 'root', 'replace', undefined, instantNavAnimation);
      scheduleOutletSync(path, 30);
    },
    [ionRouter],
  );

  const back = useCallback(
    (fallbackPath?: string) => {
      blurActiveElement();
      const intent = nextNavigationIntent();
      /**
       * Pop real del stack (no root+replace): root+replace deja Productos montado
       * con ion-page-hidden y al reentrar la URL cambia pero Pagos sigue visible.
       * Animación instantánea: el fade dejaba ambas páginas en opacity 0 → negro.
       */
      if (ionRouter.canGoBack()) {
        ionRouter.goBack(instantNavAnimation);
        const hub = fallbackPath && TAB_ROOT_PATHS.has(fallbackPath) ? fallbackPath : null;
        window.setTimeout(() => {
          if (!isCurrentNavigationIntent(intent)) return;
          if (hub && window.location.pathname !== hub) {
            ionRouter.push(hub, 'root', 'replace', undefined, instantNavAnimation);
            scheduleOutletSync(hub, 30);
            return;
          }
          scheduleOutletSync(window.location.pathname, 30);
        }, 20);
        return;
      }
      if (fallbackPath) {
        pushTabRoot(ionRouter, fallbackPath, true);
      } else {
        history.goBack();
      }
    },
    [history, ionRouter],
  );

  return { goRoot, go, replace, back, ionRouter };
}
