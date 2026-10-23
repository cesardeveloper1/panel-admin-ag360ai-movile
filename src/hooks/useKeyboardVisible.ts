import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import type { PluginListenerHandle } from '@capacitor/core';

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    if (Capacitor.isNativePlatform()) {
      const listen = async () => {
        for (const event of ['keyboardWillShow', 'keyboardWillHide'] as const) {
          try {
            const handle = await (event === 'keyboardWillShow'
              ? Keyboard.addListener('keyboardWillShow', () => { if (!disposed) setVisible(true); })
              : Keyboard.addListener('keyboardWillHide', () => { if (!disposed) setVisible(false); }));
            if (disposed) void handle.remove(); else handles.push(handle);
          } catch { /* Optional plugin; visual viewport below also handles webviews. */ }
        }
      };
      void listen();
    }
    const viewport = window.visualViewport;
    let baselineHeight = viewport?.height ?? window.innerHeight;
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && (active.matches('input,textarea') || active.isContentEditable);
      if (!editing) baselineHeight = viewport?.height ?? window.innerHeight;
      if (!Capacitor.isNativePlatform()) setVisible(Boolean(editing && viewport && baselineHeight - viewport.height > 140));
    };
    viewport?.addEventListener('resize', update);
    document.addEventListener('focusout', update);
    return () => { disposed = true; handles.forEach(handle => void handle.remove()); viewport?.removeEventListener('resize', update); document.removeEventListener('focusout', update); };
  }, []);
  return visible;
}
