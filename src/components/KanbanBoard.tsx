import type { ReactNode } from 'react';

interface KanbanBoardProps {
  children: ReactNode;
}

export function KanbanBoard({ children }: KanbanBoardProps) {
  return <div className="kanban-panel kanban-panel--vertical ag-enter">{children}</div>;
}
