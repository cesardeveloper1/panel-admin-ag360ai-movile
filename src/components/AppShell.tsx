import { useEffect, useRef, type ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { MobileSideNav } from './MobileSideNav';
import { useViewport } from '../hooks/useViewport';

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  /**
   * Chrome fijo de Agilito (hamburguesa, sin BottomNav).
   * No depende de useLocation: Ionic mantiene páginas en el stack y la ruta
   * global cambiaría el footer de Agilito al navegar a Pagos/Productos.
   */
  agilitoChrome?: boolean;
}

export function AppShell({ children, hideNav = false, agilitoChrome = false }: AppShellProps) {
  const { isTablet } = useViewport();
  const shellRef = useRef<HTMLDivElement>(null);
  const showMobileSideNav = !hideNav && !isTablet && agilitoChrome;
  const showBottomNav = !hideNav && !isTablet && !agilitoChrome;

  useEffect(() => {
    const content = shellRef.current?.closest('ion-content');
    if (!content) return;

    content.scrollEvents = true;
    let lastScrollTop = 0;
    const onScroll = (event: Event) => {
      const scrollTop = (event as CustomEvent<{ scrollTop: number }>).detail.scrollTop;
      const scrollingDown = scrollTop > lastScrollTop + 4;
      const scrollingUp = scrollTop < lastScrollTop - 4;

      if (scrollTop <= 24 || scrollingUp) {
        document.body.classList.remove('ag-module-header-hidden');
      } else if (scrollingDown && scrollTop > 72) {
        document.body.classList.add('ag-module-header-hidden');
      }

      lastScrollTop = Math.max(0, scrollTop);
    };

    content.addEventListener('ionScroll', onScroll);
    return () => {
      content.removeEventListener('ionScroll', onScroll);
      document.body.classList.remove('ag-module-header-hidden');
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={`ag-app-shell${isTablet ? ' ag-app-shell--tablet' : ''}${showBottomNav ? ' ag-app-shell--bottom-nav' : ''}`}
    >
      {!hideNav ? <SideNav /> : null}
      {showMobileSideNav ? <MobileSideNav /> : null}
      <div className="ag-app-shell-main">{children}</div>
      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
