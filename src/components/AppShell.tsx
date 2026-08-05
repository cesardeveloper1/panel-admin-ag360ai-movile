import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { MobileSideNav } from './MobileSideNav';
import { useViewport } from '../hooks/useViewport';
import { AGILITO_PATH } from '../navigation/navConfig';

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

function isAgilitoPath(pathname: string): boolean {
  return pathname === AGILITO_PATH || pathname.startsWith(`${AGILITO_PATH}/`);
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  const { isTablet } = useViewport();
  const location = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const onAgilito = isAgilitoPath(location.pathname);
  /** Agilito: hamburguesa + composer. Resto: BottomNav de master, sin hamburguesa. */
  const showMobileSideNav = !hideNav && !isTablet && onAgilito;
  const showBottomNav = !hideNav && !isTablet && !onAgilito;

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
