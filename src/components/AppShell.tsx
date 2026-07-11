import type { ReactNode } from 'react';
import { SideNav } from './SideNav';
import { MobileSideNav } from './MobileSideNav';
import { useViewport } from '../hooks/useViewport';

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  const { isTablet } = useViewport();

  return (
    <div className={`ag-app-shell${isTablet ? ' ag-app-shell--tablet' : ''}`}>
      {!hideNav ? <SideNav /> : null}
      <div className="ag-app-shell-main">{children}</div>
      {!hideNav && !isTablet ? <MobileSideNav /> : null}
    </div>
  );
}
