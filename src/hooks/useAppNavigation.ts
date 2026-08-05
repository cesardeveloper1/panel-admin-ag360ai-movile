import { useCallback } from 'react';
import { useIonRouter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { blurActiveElement } from '../utils/navFocus';
import { fadeNavAnimation, instantNavAnimation } from '../utils/instantNavAnimation';
import { syncTabVisibility } from '../utils/syncTabVisibility';
import {
  AGILITO_PATH,
  CHATS_PATH,
  PAYMENTS_PATH,
} from '../navigation/navConfig';

const TAB_ROOT_PATHS = new Set([
  AGILITO_PATH,
  '/app/business',
  '/app/operations',
  '/app/reports',
  CHATS_PATH,
  PAYMENTS_PATH,
]);

function scheduleTabSync(path: string, delayMs: number) {
  window.setTimeout(() => syncTabVisibility(path), delayMs);
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
  const anim = instant ? instantNavAnimation : fadeNavAnimation;
  const current = window.location.pathname;
  const onChild = !TAB_ROOT_PATHS.has(current);

  if (onChild && ionRouter.canGoBack()) {
    ionRouter.goBack(anim);
    window.setTimeout(() => {
      if (window.location.pathname !== path) {
        ionRouter.push(path, 'root', 'replace', undefined, anim);
        scheduleTabSync(path, 80);
      } else {
        syncTabVisibility(path);
      }
    }, instant ? 50 : 460);
    return;
  }

  ionRouter.push(path, 'root', 'replace', undefined, anim);
  scheduleTabSync(path, instant ? 50 : 100);
}

export function useAppNavigation() {
  const ionRouter = useIonRouter();
  const history = useHistory();

  const goRoot = useCallback(
    (path: string, _action: 'push' | 'replace' = 'replace', instant = false) => {
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
      ionRouter.push(path, 'forward', 'push', undefined, fadeNavAnimation);
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
      ionRouter.push(path, 'root', 'replace', undefined, fadeNavAnimation);
    },
    [ionRouter],
  );

  const back = useCallback(
    (fallbackPath?: string) => {
      blurActiveElement();
      if (ionRouter.canGoBack()) {
        ionRouter.goBack(fadeNavAnimation);
        return;
      }
      if (fallbackPath) {
        pushTabRoot(ionRouter, fallbackPath);
      } else {
        history.goBack();
      }
    },
    [history, ionRouter],
  );

  return { goRoot, go, replace, back, ionRouter };
}
