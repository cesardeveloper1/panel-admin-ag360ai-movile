import type { Brand } from '../../types';

export interface ApiBrand {
  _id?: string;
  id?: string;
  name?: string;
  subdomain?: string;
  logo?: string;
  branches?: unknown[];
  status?: boolean;
}

function brandInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (name || 'M').slice(0, 2).toUpperCase();
}

export function mapBrandFromApi(raw: ApiBrand): Brand | null {
  const id = String(raw._id ?? raw.id ?? '').trim();
  const subdomain = String(raw.subdomain ?? '').trim();
  const name = String(raw.name ?? subdomain ?? '').trim();
  if (!id || !name) return null;

  const branchCount = Array.isArray(raw.branches) ? raw.branches.length : 0;

  return {
    id,
    subdomain: subdomain || undefined,
    initials: brandInitials(name),
    nameKey: 'brands.custom',
    displayName: name,
    logoUrl: typeof raw.logo === 'string' ? raw.logo : '',
    locations: branchCount || 1,
    ordersToday: 0,
  };
}

export function mapBrandsFromApi(list: ApiBrand[]): Brand[] {
  return list
    .map(mapBrandFromApi)
    .filter((b): b is Brand => b !== null)
    .filter((b) => b.subdomain);
}
