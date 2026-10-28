import type { OrderStatus } from '../types';

export const PARTNER_ZONES_PATH = '/app/partner/zones';
export const PARTNER_GROUPS_PATH = '/app/partner/groups';
export const PARTNER_ACCOUNT_PATH = '/app/partner/account';

export const MOTORIZED_PATHS = [PARTNER_ZONES_PATH, PARTNER_GROUPS_PATH, PARTNER_ACCOUNT_PATH] as const;

export const MOTORIZED_BOARD_STATUSES = ['in_kitchen', 'on_the_way', 'delivered'] as const satisfies readonly OrderStatus[];

export function isMotorizedRole(role: string | undefined): boolean {
  return role === 'motorized';
}
