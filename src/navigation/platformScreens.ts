export const PLATFORM_PATH = '/app/platform';

export const PLATFORM_GROUPS = [
  { id: 'tower', path: '/app/platform/tower', titleKey: 'platform.tower' },
  { id: 'reports', path: '/app/platform/reports', titleKey: 'platform.reports' },
  { id: 'delivery', path: '/app/platform/delivery', titleKey: 'platform.delivery' },
  { id: 'billing', path: '/app/platform/billing', titleKey: 'platform.billing' },
  { id: 'settings', path: '/app/platform/settings', titleKey: 'platform.settings' },
] as const;

export type PlatformGroupId = (typeof PLATFORM_GROUPS)[number]['id'];

export interface PlatformScreen {
  path: string;
  group: PlatformGroupId;
  titleKey: string;
  endpoint: string;
  /** La fila entra a la marca, como Marcas en el panel web. */
  brands?: boolean;
}

export const PLATFORM_SCREENS: readonly PlatformScreen[] = [
  { path: '/app/platform/tower/connections', group: 'tower', titleKey: 'platform.connections', endpoint: '/whatsapp-instances?page=1&limit=20' },
  { path: '/app/platform/tower/usability', group: 'tower', titleKey: 'platform.usability', endpoint: '/usability/brands-schedules?page=1&limit=20' },
  { path: '/app/platform/tower/agents', group: 'tower', titleKey: 'platform.agents', endpoint: '/bot-config?page=1&limit=20' },
  { path: '/app/platform/tower/analytics', group: 'tower', titleKey: 'platform.analytics', endpoint: '/analytics/mixpanel/summary' },
  { path: '/app/platform/reports/messages', group: 'reports', titleKey: 'platform.messages', endpoint: '/conversation-observability/summary' },
  { path: '/app/platform/reports/orders', group: 'reports', titleKey: 'platform.orders', endpoint: '/orders?page=1&limit=20' },
  { path: '/app/platform/reports/integration', group: 'reports', titleKey: 'platform.integration', endpoint: '/orders/reports/erp-integration' },
  { path: '/app/platform/reports/meta', group: 'reports', titleKey: 'platform.meta', endpoint: '/orders/reports/meta-ads' },
  { path: '/app/platform/reports/cancelled', group: 'reports', titleKey: 'platform.cancelled', endpoint: '/orders/cancellations' },
  { path: '/app/platform/reports/map', group: 'reports', titleKey: 'platform.map', endpoint: '/map-analytics/locations?limit=20' },
  { path: '/app/platform/reports/complaints', group: 'reports', titleKey: 'platform.complaints', endpoint: '/complains' },
  { path: '/app/platform/reports/nps', group: 'reports', titleKey: 'platform.nps', endpoint: '/nps-survey' },
  { path: '/app/platform/reports/branch-survey', group: 'reports', titleKey: 'platform.branchSurvey', endpoint: '/nps-survey-config' },
  { path: '/app/platform/delivery/channels', group: 'delivery', titleKey: 'platform.channels', endpoint: '/delivery-partners' },
  { path: '/app/platform/delivery/templates', group: 'delivery', titleKey: 'platform.templates', endpoint: '/zone-templates' },
  { path: '/app/platform/delivery/yango', group: 'delivery', titleKey: 'platform.yango', endpoint: '/yango/deliveries/all?limit=20' },
  { path: '/app/platform/billing/accounts', group: 'billing', titleKey: 'platform.accounts', endpoint: '/brands/billing/entitlements?page=1&limit=20' },
  { path: '/app/platform/settings/brands', group: 'settings', titleKey: 'platform.brands', endpoint: '/brand/all', brands: true },
  { path: '/app/platform/settings/locals', group: 'settings', titleKey: 'platform.locals', endpoint: '/admin/locales-activos' },
  { path: '/app/platform/settings/users', group: 'settings', titleKey: 'platform.users', endpoint: '/users' },
  { path: '/app/platform/settings/requests', group: 'settings', titleKey: 'platform.requests', endpoint: '/user-action-requests?type=REGISTER' },
  { path: '/app/platform/settings/groups', group: 'settings', titleKey: 'platform.groups', endpoint: '/usability/whatsapp-groups' },
  { path: '/app/platform/settings/models', group: 'settings', titleKey: 'platform.models', endpoint: '/ai-model-pricing' },
  { path: '/app/platform/settings/help', group: 'settings', titleKey: 'platform.help', endpoint: '/tutorial-videos?limit=50' },
];

const PLATFORM_PATHS = new Set<string>([
  PLATFORM_PATH,
  ...PLATFORM_GROUPS.map((group) => group.path),
  ...PLATFORM_SCREENS.map((screen) => screen.path),
]);

export function isPlatformPath(path: string): boolean {
  return PLATFORM_PATHS.has(path);
}

export function platformGroup(path: string) {
  return PLATFORM_GROUPS.find((group) => group.path === path);
}

export function platformScreen(path: string) {
  return PLATFORM_SCREENS.find((screen) => screen.path === path);
}

export const PLATFORM_ROUTE_PATHS: string[] = [...PLATFORM_PATHS];
