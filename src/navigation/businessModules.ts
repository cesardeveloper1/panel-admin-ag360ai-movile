import {
  businessOutline,
  colorPaletteOutline,
  megaphoneOutline,
  restaurantOutline,
} from 'ionicons/icons';

export type BusinessModuleId = 'products' | 'clients' | 'locations' | 'brand';

export type HubCardTone = 'pulse' | 'hot' | 'done' | 'ink';

export interface BusinessModule {
  id: BusinessModuleId;
  path: string;
  icon: string;
  hubTone: HubCardTone;
  /** Keys i18n por superficie (path/icon no se duplican). */
  i18n: {
    agilitoLabel: string;
    paymentsTitle: string;
    paymentsDesc: string;
    businessTitle: string;
    businessDesc: string;
  };
}

/**
 * Catálogo único de módulos de negocio.
 * Consumido por Agilito, Pagos y Business hubs.
 */
export const BUSINESS_MODULES: readonly BusinessModule[] = [
  {
    id: 'products',
    path: '/app/products',
    icon: restaurantOutline,
    hubTone: 'pulse',
    i18n: {
      agilitoLabel: 'agilito.menuTitle',
      paymentsTitle: 'payments.menuTitle',
      paymentsDesc: 'payments.menuDesc',
      businessTitle: 'business.menuTitle',
      businessDesc: 'business.menuDesc',
    },
  },
  {
    id: 'clients',
    path: '/app/clients',
    icon: megaphoneOutline,
    hubTone: 'hot',
    i18n: {
      agilitoLabel: 'agilito.marketingTitle',
      paymentsTitle: 'payments.marketingTitle',
      paymentsDesc: 'payments.marketingDesc',
      businessTitle: 'business.marketingTitle',
      businessDesc: 'business.marketingDesc',
    },
  },
  {
    id: 'locations',
    path: '/app/locations',
    icon: businessOutline,
    hubTone: 'done',
    i18n: {
      agilitoLabel: 'agilito.locationsTitle',
      paymentsTitle: 'payments.locationsTitle',
      paymentsDesc: 'payments.locationsDesc',
      businessTitle: 'business.locationsTitle',
      businessDesc: 'business.locationsDesc',
    },
  },
  {
    id: 'brand',
    path: '/app/datos-marca',
    icon: colorPaletteOutline,
    hubTone: 'ink',
    i18n: {
      agilitoLabel: 'agilito.brandTitle',
      paymentsTitle: 'payments.brandTitle',
      paymentsDesc: 'payments.brandDesc',
      businessTitle: 'business.brandTitle',
      businessDesc: 'business.brandDesc',
    },
  },
] as const;

/** Paths canónicos de los 4 módulos. */
export const BUSINESS_MODULE_PATHS: readonly string[] = BUSINESS_MODULES.map(
  (m) => m.path,
);

export function getBusinessModule(id: BusinessModuleId): BusinessModule {
  const mod = BUSINESS_MODULES.find((m) => m.id === id);
  if (!mod) throw new Error(`Unknown business module: ${id}`);
  return mod;
}
