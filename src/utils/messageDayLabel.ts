const DEFAULT_BRAND_TIMEZONE = 'America/Lima';

/** Separador de día, igual que el panel: "20 de julio, 2026" en la zona de la marca. */
export function formatMessageDayLabel(iso?: string, timeZone?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timeZone || DEFAULT_BRAND_TIMEZONE,
  }).formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;
  if (!day || !month || !year) return '';
  return `${day} de ${month}, ${year}`;
}
