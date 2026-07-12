import { useCallback } from 'react';
import { useIonRouter } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { blurActiveElement } from '../utils/navFocus';
import { fadeNavAnimation, instantNavAnimation } from '../utils/instantNavAnimation';
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

export function useAppNavigation() {
  const ionRouter = useIonRouter();
  const history = useHistory();

  const goRoot = useCallback(
    (path: string, action: 'push' | 'replace' = 'replace', instant = false) => {
      blurActiveElement();
      if (instant) {
        ionRouter.push(path, 'root', action, undefined, instantNavAnimation);
        return;
      }
      ionRouter.push(path, 'root', action, undefined, fadeNavAnimation);
    },
    [ionRouter],
  );

  const go = useCallback(
    (path: string) => {
      blurActiveElement();
      if (TAB_ROOT_PATHS.has(path)) {
        ionRouter.push(path, 'root', 'replace', undefined, fadeNavAnimation);
        return;
      }
      ionRouter.push(path, 'forward', 'push', undefined, fadeNavAnimation);
    },
    [ionRouter],
  );

  const replace = useCallback(
    (path: string) => {
      blurActiveElement();
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
        ionRouter.push(fallbackPath, 'back', 'replace', undefined, fadeNavAnimation);
      } else {
        history.goBack();
      }
    },
    [history, ionRouter],
  );

  return { goRoot, go, replace, back, ionRouter };
}
