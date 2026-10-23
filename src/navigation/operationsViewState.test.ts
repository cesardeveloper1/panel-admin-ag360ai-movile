import { expect, it } from 'vitest';
import { clearOperationsViews, operationsViewGeneration, readOperationsView, writeOperationsView, type OperationsViewState } from './operationsViewState';
it('retains the queue across ten alternations without copying order or conversation data', () => {
  clearOperationsViews();
  const generation = operationsViewGeneration();
  const state: OperationsViewState = { mode: 'orders', query: 'QA-001', focus: 'processing', subFilter: 'ready', funnelFocus: 'HUMANO', visibleCount: 18, selectedOrderId: 'order-1', scrollTop: 650 };
  for (let count = 0; count < 10; count += 1) {
    writeOperationsView('session|brandA', state, generation);
    expect(readOperationsView('session|brandA')).toEqual(state);
  }
  expect(readOperationsView('session|brandB')).toBeUndefined();
  clearOperationsViews();
  // Cleanup of a cached Ionic page must not repopulate private state after logout.
  writeOperationsView('session|brandA', state, generation);
  expect(readOperationsView('session|brandA')).toBeUndefined();
});
