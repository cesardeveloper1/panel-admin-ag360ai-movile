type MobilePrintSignalListener = () => void;

const listeners = new Set<MobilePrintSignalListener>();

export const mobilePrintSignals = {
  notify(): void {
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: MobilePrintSignalListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
