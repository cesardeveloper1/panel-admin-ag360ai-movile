/** Wakeups from the authenticated /orders connection; no rider data is cached here. */
const listeners = new Set<() => void>();
export const notifyFleetRidersChanged = () => {listeners.forEach(listener => listener());};
export const subscribeFleetRidersChanged = (listener: () => void) => {
  listeners.add(listener);
  return () => {listeners.delete(listener);};
};
