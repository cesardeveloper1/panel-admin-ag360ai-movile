const prefix = 'agilito-chat:';

export function readAgilitoSession<T>(scope: string): T | undefined {
  try {
    return JSON.parse(localStorage.getItem(prefix + scope) ?? 'null') ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveAgilitoSession<T>(scope: string, value: T) {
  try {
    localStorage.setItem(prefix + scope, JSON.stringify(value));
  } catch {
    // The chat remains usable in memory if storage is unavailable.
  }
}

export function clearAgilitoSessions() {
  if (typeof localStorage === 'undefined') return;
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (key?.startsWith(prefix)) localStorage.removeItem(key);
  }
}
