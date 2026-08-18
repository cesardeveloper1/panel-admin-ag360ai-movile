import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useApp } from '../hooks/useApp';

const LIGHT_BG = '#ffffff';
const DARK_BG = '#141A32';

export function useNativeChrome() {
  const { darkMode } = useApp();

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--ag-safe-top',
      'max(env(safe-area-inset-top, 0px), var(--ag-status-bar-fallback, 0px))',
    );

    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add('ag-native');
    document.documentElement.style.setProperty('--ag-status-bar-fallback', '36px');
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const bg = darkMode ? DARK_BG : LIGHT_BG;
    document.documentElement.style.setProperty('--ag-status-bar-color', bg);

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: bg });
        await StatusBar.setStyle({ style: darkMode ? Style.Light : Style.Dark });
      } catch {
        /* plugin optional in web */
      }
    })();
  }, [darkMode]);
}
