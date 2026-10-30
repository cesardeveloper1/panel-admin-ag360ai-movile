const TIME_ZONE = 'America/Lima';

export const parseFleetClock = (value?: string | null): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
};

const minutesInLima = (now: Date): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
};

/** Sin horario configurado no se corta el GPS. La hora de fin no entra en la franja. */
export const isWithinFleetHours = (
  startTime?: string | null,
  endTime?: string | null,
  now = new Date(),
): boolean => {
  const start = parseFleetClock(startTime);
  const end = parseFleetClock(endTime);
  if (start == null || end == null || start === end) return true;
  const current = minutesInLima(now);
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
};
