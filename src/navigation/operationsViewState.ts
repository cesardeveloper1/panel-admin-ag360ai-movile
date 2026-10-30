import type { FunnelStage } from '../types/contact';
import type { KanbanGroup, KanbanSubState } from '../types';
export interface OperationsViewState {
  mode: 'orders' | 'funnel' | 'reservations'; query: string; focus: KanbanGroup; subFilter: 'all' | KanbanSubState;
  funnelFocus: FunnelStage; visibleCount: number; selectedOrderId?: string; scrollTop: number;
}
let generation = 0;
const views = new Map<string, OperationsViewState>();
export function operationsViewGeneration() { return generation; }
export function readOperationsView(scope: string) { return views.get(scope); }
export function writeOperationsView(scope: string, state: OperationsViewState, expectedGeneration: number) {
  if (expectedGeneration !== generation) return;
  views.set(scope, { ...state });
}
export function clearOperationsViews() { generation += 1; views.clear(); }
