import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { canNavigate, navigationLandingPath } from '../navigation/navigationAccess';
import { normalizePath } from '../navigation/appRouteRegistry';
import {
  PLATFORM_GROUPS,
  PLATFORM_PATH,
  PLATFORM_SCREENS,
  platformGroup,
  platformScreen,
  type PlatformScreen,
} from '../navigation/platformScreens';
import { api } from '../services/api';
import { apiFacade } from '../services/apiFacade';
import type { Brand } from '../types';
import { brandLabel } from '../utils/brandLabel';

type Row = { id: string; title: string; detail?: string };

const TITLE_KEYS = ['name', 'title', 'label', 'displayName', 'brandName', 'subdomain', 'email', 'phone', 'orderNumber', 'number', 'subject', 'instanceName'];
const LIST_KEYS = ['items', 'data', 'results', 'brands', 'users', 'requests', 'groups', 'templates', 'deliveries', 'complains', 'videos', 'entitlements', 'locales', 'instances'];

function unwrap(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).data;
  }
  return data ?? payload;
}

function textOf(item: Record<string, unknown>): string {
  for (const key of TITLE_KEYS) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  const first = Object.values(item).find((value) => typeof value === 'string' && value.trim());
  return typeof first === 'string' ? first.trim() : '';
}

function asRows(payload: unknown): Row[] {
  const value = unwrap(payload);
  if (Array.isArray(value)) return mapList(value);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const nested = LIST_KEYS.map((key) => record[key]).find(Array.isArray);
  if (nested) return mapList(nested);
  return Object.entries(record)
    .filter((entry): entry is [string, string | number] => typeof entry[1] === 'string' || typeof entry[1] === 'number')
    .slice(0, 12)
    .map(([key, detail]) => ({ id: key, title: key, detail: String(detail) }));
}

function mapList(list: unknown[]): Row[] {
  return list.map((item, index) => {
    if (!item || typeof item !== 'object') return { id: String(index), title: String(item ?? '') };
    const record = item as Record<string, unknown>;
    const detail = typeof record.status === 'string' ? record.status : typeof record.role === 'string' ? record.role : typeof record.subdomain === 'string' ? record.subdomain : undefined;
    return { id: String(record._id ?? record.id ?? index), title: textOf(record), detail };
  }).filter((row) => row.title);
}

function todayStamp(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function salesSnapshot(payload: unknown): { sales?: number; orders?: number; ticket?: number; customers?: number } | null {
  const value = unwrap(payload);
  if (!value || typeof value !== 'object') return null;
  const metrics = (value as Record<string, unknown>).salesMetrics;
  if (!metrics || typeof metrics !== 'object') return null;
  const bag = 'totalOrders' in metrics
    ? metrics
    : Object.values(metrics).find((item) => item && typeof item === 'object' && 'totalOrders' in (item as object));
  if (!bag || typeof bag !== 'object') return null;
  const row = bag as Record<string, unknown>;
  const read = (key: string) => (typeof row[key] === 'number' ? row[key] as number : undefined);
  const snapshot = { sales: read('totalSales'), orders: read('totalOrders'), ticket: read('averageTicket'), customers: read('uniqueCustomers') };
  return snapshot.sales == null && snapshot.orders == null ? null : snapshot;
}

function Unavailable({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <p>{t('ops.reliability.unavailable')}</p>
      <button type="button" className="ag-btn" onClick={onRetry}>{t('ops.reliability.retry')}</button>
    </div>
  );
}

function RowList({ rows }: { rows: Row[] }) {
  const { t } = useTranslation();
  if (rows.length === 0) return <p>{t('platform.empty')}</p>;
  return (
    <>
      {rows.map((row) => (
        <article className="ops-connection" key={row.id}>
          <strong>{row.title}</strong>
          {row.detail ? <p>{row.detail}</p> : null}
        </article>
      ))}
    </>
  );
}

const PlatformHome: React.FC = () => {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const [snapshot, setSnapshot] = useState<ReturnType<typeof salesSnapshot> | undefined>(undefined);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(false);
    setSnapshot(undefined);
    const day = todayStamp();
    void api.get(`/dashboard/orderfood?restaurant=all&dateFrom=${day}&dateTo=${day}`).then((payload) => {
      if (alive) setSnapshot(salesSnapshot(payload));
    }).catch(() => {
      if (alive) setError(true);
    });
    return () => { alive = false; };
  }, [retry]);

  const amount = (value: number | undefined) => (value == null ? '—' : value.toLocaleString('es-PE'));

  return (
    <StackLayout title={t('platform.title')} showBack={false} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack platform-screen">
      {error ? <Unavailable onRetry={() => setRetry((value) => value + 1)} /> : snapshot === undefined ? (
        <p role="status">{t('ops.filters.loadingMessages')}</p>
      ) : (
        <div className="platform-metrics">
          <article><span>{t('platform.sales')}</span><strong>{amount(snapshot?.sales)}</strong></article>
          <article><span>{t('platform.orderCount')}</span><strong>{amount(snapshot?.orders)}</strong></article>
          <article><span>{t('platform.ticket')}</span><strong>{amount(snapshot?.ticket)}</strong></article>
          <article><span>{t('platform.customers')}</span><strong>{amount(snapshot?.customers)}</strong></article>
        </div>
      )}
      <div className="platform-grid">
        {PLATFORM_GROUPS.map((group) => (
          <button key={group.path} type="button" className="hub-card hub-card--ink" onClick={() => go(group.path)}>
            <span className="hub-card-copy"><strong>{t(group.titleKey)}</strong></span>
          </button>
        ))}
      </div>
    </StackLayout>
  );
};

const PlatformGroupView: React.FC<{ path: string }> = ({ path }) => {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const group = platformGroup(path);
  if (!group) return null;
  const children = PLATFORM_SCREENS.filter((screen) => screen.group === group.id);
  return (
    <StackLayout title={t(group.titleKey)} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack platform-screen">
      <div className="platform-grid">
        {children.map((screen) => (
          <button key={screen.path} type="button" className="hub-card hub-card--ink" onClick={() => go(screen.path)}>
            <span className="hub-card-copy"><strong>{t(screen.titleKey)}</strong></span>
          </button>
        ))}
      </div>
    </StackLayout>
  );
};

const PlatformList: React.FC<{ screen: PlatformScreen }> = ({ screen }) => {
  const { t } = useTranslation();
  const { session, selectBrandAndLoad, showToast } = useApp();
  const { goRoot } = useAppNavigation();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [entering, setEntering] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(false);
    setRows(null);
    setBrands(null);
    const load = screen.brands
      ? apiFacade.getBrands().then((list) => { if (alive) setBrands(list); })
      : api.get(screen.endpoint).then((payload) => { if (alive) setRows(asRows(payload)); });
    void load.catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [retry, screen.brands, screen.endpoint]);

  const enter = async (brand: Brand) => {
    if (entering) return;
    setEntering(brand.id);
    try {
      const ok = await selectBrandAndLoad(brand);
      if (ok) goRoot(navigationLandingPath(session), 'replace', true);
      else showToast('toast.brandLoading');
    } finally {
      setEntering(null);
    }
  };

  return (
    <StackLayout title={t(screen.titleKey)} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack platform-screen">
      {error ? <Unavailable onRetry={() => setRetry((value) => value + 1)} /> : screen.brands ? (
        brands == null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : brands.length === 0 ? <p>{t('platform.empty')}</p> : (
          <div className="platform-grid">
            {brands.map((brand) => (
              <button key={brand.id} type="button" className="hub-card hub-card--ink" disabled={entering === brand.id} onClick={() => void enter(brand)}>
                <span className="hub-card-copy">
                  <strong>{brandLabel(brand, t)}</strong>
                  <span>{t('platform.enterBrand')}</span>
                </span>
              </button>
            ))}
          </div>
        )
      ) : rows == null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : <RowList rows={rows} />}
    </StackLayout>
  );
};

const PlatformPage: React.FC = () => {
  const { pathname } = useLocation();
  const path = normalizePath(pathname);
  const { session } = useApp();
  const { goRoot } = useAppNavigation();

  useEffect(() => {
    if (!session) return;
    if (!canNavigate(session, path)) goRoot(navigationLandingPath(session), 'replace', true);
  }, [goRoot, path, session]);

  if (path === PLATFORM_PATH) return <PlatformHome />;
  if (platformGroup(path)) return <PlatformGroupView path={path} />;
  const screen = platformScreen(path);
  if (screen) return <PlatformList screen={screen} />;
  return null;
};

export default PlatformPage;
