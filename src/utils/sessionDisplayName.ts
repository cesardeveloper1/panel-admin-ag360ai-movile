import type { TFunction } from 'i18next';
import type { UserSession } from '../types';

export function sessionDisplayName(
  session: UserSession | null | undefined,
  t: TFunction,
): string {
  if (!session) return '';
  if (session.displayName?.trim()) return session.displayName.trim();
  return t(session.nameKey);
}
