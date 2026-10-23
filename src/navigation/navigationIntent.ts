let intent = 0;
export function nextNavigationIntent(): number { return ++intent; }
export function isCurrentNavigationIntent(value: number): boolean { return intent === value; }
