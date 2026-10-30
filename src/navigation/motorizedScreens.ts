import type { OrderStatus } from '../types';

export const PARTNER_ZONES_PATH = '/app/partner/zones';
export const PARTNER_GROUPS_PATH = '/app/partner/groups';
export const PARTNER_ACCOUNT_PATH = '/app/partner/account';
export const PARTNER_RIDERS_PATH = '/app/partner/riders';
export const DISPATCH_DELIVERED_PATH = '/app/operations/delivered';
export const TRIP_PATH = '/app/trip';

export const MOTORIZED_PATHS = [
  PARTNER_ZONES_PATH,
  PARTNER_GROUPS_PATH,
  PARTNER_ACCOUNT_PATH,
  PARTNER_RIDERS_PATH,
  DISPATCH_DELIVERED_PATH,
] as const;

export const MOTORIZED_BOARD_STATUSES = ['in_kitchen', 'on_the_way', 'delivered'] as const satisfies readonly OrderStatus[];

export function isMotorizedRole(role: string | undefined): boolean {
  return role === 'motorized';
}

export function isRiderRole(role: string | undefined): boolean {
  return role === 'rider';
}

export function isFleetPhoneRole(role: string | undefined): boolean {
  return isMotorizedRole(role) || isRiderRole(role);
}
