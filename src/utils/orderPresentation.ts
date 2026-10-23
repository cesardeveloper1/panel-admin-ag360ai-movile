import type { Brand, Order } from '../types';

export function orderAmount(amount: number, brand: Brand | null, locale: string): string {
  const code = brand?.currency?.code;
  try {
    if (code) return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(amount);
  } catch { /* Invalid/missing currency must not invent PEN. */ }
  const value = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return brand?.currency?.symbol ? `${brand.currency.symbol} ${value}` : value;
}

export function orderCreatedTime(order: Order, brand: Brand | null, locale: string): string | null {
  const value = Date.parse(order.createdAt ?? '');
  if (!Number.isFinite(value)) return null;
  try {
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: brand?.timezone || 'UTC', timeZoneName: brand?.timezone ? undefined : 'short' }).format(value);
  } catch { return null; }
}
