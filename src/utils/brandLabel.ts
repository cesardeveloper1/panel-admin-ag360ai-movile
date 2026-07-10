import type { TFunction } from 'i18next';
import type { Brand } from '../types';

export function brandLabel(brand: Brand | null | undefined, t: TFunction): string {
  if (!brand) return '';
  if (brand.displayName?.trim()) return brand.displayName.trim();
  return t(brand.nameKey);
}
