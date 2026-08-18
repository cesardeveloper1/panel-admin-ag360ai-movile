import { App as CapacitorApp, type AppState } from '@capacitor/app';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';
import { useApp } from '../hooks/useApp';
import { mobilePrintCoordinator } from '../services/mobilePrintCoordinator';
import { mobilePrintSignals } from '../services/mobilePrintSignals';
import { thermalPrinter } from '../native/thermalPrinter';

export function MobilePrintProvider({ children }: PropsWithChildren) {
  const { session, brand } = useApp();
  const previousSession = useRef(session);

  useEffect(() => {
    const hadSession = Boolean(previousSession.current);
    previousSession.current = session;
    if (hadSession && !session && thermalPrinter.isNativeAvailable()) {
      void mobilePrintCoordinator.disableCurrentStation().catch(() => undefined);
    }
  }, [session]);

  useEffect(() => {
    if (!session || !brand?.id || !thermalPrinter.isNativeAvailable()) return;
    const sync = (reason: 'startup' | 'foreground' | 'socket' | 'configuration') => {
      void mobilePrintCoordinator.sync(brand.id, reason).catch(() => undefined);
    };

    sync('startup');
    const unsubscribe = mobilePrintSignals.subscribe(() => sync('socket'));
    let active = true;
    let appStateHandle: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener('appStateChange', (state: AppState) => {
      if (state.isActive) sync('foreground');
    }).then((handle) => {
      if (active) appStateHandle = handle;
      else void handle.remove();
    });

    return () => {
      active = false;
      unsubscribe();
      if (appStateHandle) void appStateHandle.remove();
    };
  }, [session, brand?.id]);

  return children;
}
