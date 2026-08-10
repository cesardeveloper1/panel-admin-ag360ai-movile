import { useEffect, useRef, type ReactNode } from 'react';
// import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { MobileSideNav } from './MobileSideNav';
import { useViewport } from '../hooks/useViewport';

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  /**
   * Oculta la hamburguesa de forma estable (no depende del pathname global).
   * Necesario en módulos stack: al Volver la URL cambia antes de desmontar la página.
   */
  hideMobileMenu?: boolean;
  /** Bloquea el scroll exterior cuando una vista administra su propio scroll interno. */
  lockScroll?: boolean;
  /** @deprecated BottomNav desactivado; se mantiene por compatibilidad con AgilitoPage. */
  agilitoChrome?: boolean;
}

export function AppShell({
  children,
  hideNav = false,
  hideMobileMenu = false,
  lockScroll = false,
}: AppShellProps) {
  const { isTablet } = useViewport();
  const shellRef = useRef<HTMLDivElement>(null);
  const noHamburger = hideMobileMenu;
  const showMobileSideNav = !hideNav && !isTablet && !noHamburger;
  // BottomNav desactivado — navegación por hamburguesa / SideNav (misma lógica go/pushTabRoot).
  // const showBottomNav = !hideNav && !isTablet && !agilitoChrome;

  useEffect(() => {
    const content = shellRef.current?.closest('ion-content') as HTMLIonContentElement | null;
    if (!content) return;
    // Tablet+: scroll en la columna main; ion-content no debe mover sidebar/header.
    content.scrollY = !isTablet && !lockScroll;
  }, [isTablet, lockScroll]);

  useEffect(() => {
    const content = shellRef.current?.closest('ion-content');
    const main = shellRef.current?.querySelector('.ag-app-shell-main');
    if (!content && !main) return;

    if (lockScroll) {
      document.body.classList.remove('ag-module-header-hidden');
      return;
    }

    let lastScrollTop = 0;

    const applyScrollState = (scrollTop: number) => {
      const scrollingDown = scrollTop > lastScrollTop + 4;
      const scrollingUp = scrollTop < lastScrollTop - 4;

      if (scrollTop <= 24 || scrollingUp) {
        document.body.classList.remove('ag-module-header-hidden');
      } else if (scrollingDown && scrollTop > 72) {
        document.body.classList.add('ag-module-header-hidden');
      }

      lastScrollTop = Math.max(0, scrollTop);
    };

    const onIonScroll = (event: Event) => {
      applyScrollState((event as CustomEvent<{ scrollTop: number }>).detail.scrollTop);
    };

    const onMainScroll = (event: Event) => {
      applyScrollState((event.currentTarget as HTMLElement).scrollTop);
    };

    if (isTablet && main) {
      main.addEventListener('scroll', onMainScroll, { passive: true });
      return () => {
        main.removeEventListener('scroll', onMainScroll);
        document.body.classList.remove('ag-module-header-hidden');
      };
    }

    if (!content) return;
    content.scrollEvents = true;
    content.addEventListener('ionScroll', onIonScroll);
    return () => {
      content.removeEventListener('ionScroll', onIonScroll);
      document.body.classList.remove('ag-module-header-hidden');
    };
  }, [isTablet, lockScroll]);

  return (
    <div
      ref={shellRef}
      className={[
        'ag-app-shell',
        isTablet ? 'ag-app-shell--tablet' : '',
        noHamburger ? 'ag-app-shell--no-hamburger' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!hideNav ? <SideNav /> : null}
      {showMobileSideNav ? <MobileSideNav /> : null}
      <div className="ag-app-shell-main">{children}</div>
      {/* BottomNav desactivado: usar hamburguesa / SideNav
      {showBottomNav ? <BottomNav /> : null}
      */}
    </div>
  );
}
