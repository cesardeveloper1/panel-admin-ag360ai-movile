import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { canNavigate, navigationLandingPath } from '../navigation/navigationAccess';
import { staffScreen, type StaffScreen } from '../navigation/staffScreens';
import { api } from '../services/api';
import { apiFacade } from '../services/apiFacade';
import { useTranslation } from 'react-i18next';

type Row = { id: string; title: string; detail?: string };

function unwrap(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).data;
  }
  return data ?? payload;
}

function asRows(payload: unknown): Row[] {
  const value = unwrap(payload);
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? (['items', 'campaigns', 'categories', 'modifiers', 'zones', 'galleries', 'complains', 'templates'] as const)
        .map((key) => (value as Record<string, unknown>)[key])
        .find(Array.isArray) ?? []
      : [];
  return (list as Record<string, unknown>[]).map((item, index) => ({
    id: String(item._id ?? item.id ?? index),
    title: String(item.name ?? item.title ?? item.label ?? item.number ?? item.subject ?? item._id ?? ''),
    detail: typeof item.description === 'string' ? item.description : typeof item.status === 'string' ? item.status : undefined,
  })).filter((row) => row.title);
}

function listUrl(screen: StaffScreen, brandId: string, subdomain: string): string | null {
  const query = `brandId=${encodeURIComponent(brandId)}`;
  switch (screen.path) {
    case '/app/menu/categories':
    case '/app/menu/local':
      return `/category/${encodeURIComponent(brandId)}`;
    case '/app/menu/modifiers':
    case '/app/menu/groups':
      return `/modifier/${encodeURIComponent(brandId)}`;
    case '/app/menu/integrations':
      return `/integration/compare/${encodeURIComponent(brandId)}`;
    case '/app/marketing/templates':
      return `/whatsapp-templates?${query}`;
    case '/app/marketing/campaigns':
      return `/mass-campaigns?${query}`;
    case '/app/marketing/complaints':
      return subdomain ? `/complains?subdomain=${encodeURIComponent(subdomain)}` : null;
    case '/app/marketing/branch-survey':
      return `/nps-survey-config/brand/${encodeURIComponent(brandId)}`;
    case '/app/locations/zones':
      return `/coverage-zone/by-brand/${encodeURIComponent(brandId)}`;
    case '/app/locations/gallery':
      return `/gallery/brand/${encodeURIComponent(brandId)}`;
    case '/app/locations/integrations':
      return `/branch/brand/${encodeURIComponent(brandId)}`;
    case '/app/help':
      return '/tutorial-videos?limit=50';
    default:
      return null;
  }
}

const StaffScreenPage: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const screen = staffScreen(pathname);
  const { brand, session, authEpoch, showToast } = useApp();
  const { goRoot } = useAppNavigation();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(false);
  const [rules, setRules] = useState({ maxPartySize: 8, minNoticeHours: 1, maxAdvanceDays: 30, slotIntervalMinutes: 30 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!screen || !session) return;
    if (!canNavigate(session, screen.path, { locations: brand?.locations })) {
      goRoot(navigationLandingPath(session), 'replace', true);
    }
  }, [brand?.locations, goRoot, screen, session]);

  useEffect(() => {
    if (!screen || !brand?.id || screen.kind === 'agilink') return;
    let alive = true;
    setRows(null);
    setError(false);
    const subdomain = brand.subdomain ?? '';
    const load = async () => {
      if (screen.kind === 'report') {
        const report = await apiFacade.getDashboard({ brand, period: 'today' });
        if (screen.path.endsWith('/orders')) {
          return report.restaurantRanking.map((item) => ({ id: item.id, title: item.nameKey, detail: String(item.orders) }));
        }
        if (screen.path.endsWith('/integration-sales')) {
          return report.channelComparison.map((item, index) => ({ id: String(index), title: item.label, detail: String(item.sales) }));
        }
        if (screen.path.endsWith('/order-map')) {
          return report.restaurantRanking.map((item) => ({ id: item.id, title: item.nameKey, detail: String(item.sales) }));
        }
        if (screen.path.endsWith('/cash-close')) {
          return report.paymentMethods.map((item) => ({ id: item.id, title: item.labelKey, detail: String(item.amount) }));
        }
        const cancelled = report.kpis.find((item) => item.id === 'cancelled');
        return [{ id: 'cancelled', title: t('staff.reportCancelled'), detail: cancelled ? String(cancelled.value) : '0' }];
      }
      if (screen.kind === 'reservation') {
        if (!subdomain) return [];
        const payload = unwrap(await api.get(`/reservation-config?brandSubdomain=${encodeURIComponent(subdomain)}`));
        const config = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
        const nextRules = config.rules && typeof config.rules === 'object' ? config.rules as typeof rules : {
          maxPartySize: 8, minNoticeHours: 1, maxAdvanceDays: 30, slotIntervalMinutes: 30,
        };
        if (alive) {
          setActive(Boolean(config.isActive));
          setRules({
            maxPartySize: Number(nextRules.maxPartySize ?? 8),
            minNoticeHours: Number(nextRules.minNoticeHours ?? 1),
            maxAdvanceDays: Number(nextRules.maxAdvanceDays ?? 30),
            slotIntervalMinutes: Number(nextRules.slotIntervalMinutes ?? 30),
          });
        }
        const zones = Array.isArray(config.zones) ? config.zones as Record<string, unknown>[] : [];
        const tables = Array.isArray(config.tables) ? config.tables as Record<string, unknown>[] : [];
        return [
          ...zones.map((zone, index) => ({ id: String(zone.id ?? index), title: String(zone.name ?? ''), detail: t('staff.zone') })),
          ...tables.map((table, index) => ({ id: String(table.id ?? `t${index}`), title: String(table.number ?? ''), detail: t('staff.table') })),
        ];
      }
      if (screen.kind === 'local') {
        return Object.entries(brand.branchNames ?? {}).map(([id, name]) => ({ id, title: name }));
      }
      const url = listUrl(screen, brand.id, subdomain);
      if (!url) return [];
      return asRows(await api.get(url));
    };
    void load().then((next) => {
      if (alive) setRows(next);
    }).catch(() => {
      if (alive) setError(true);
    });
    return () => { alive = false; };
  }, [authEpoch, brand, retry, screen, t]);

  if (!screen) return null;
  const cartaUrl = brand?.subdomain ? `https://menu.agiliza360.ai/api/p/${encodeURIComponent(brand.subdomain)}` : '';
  const agilinkUrl = brand?.subdomain ? `https://link.agiliza360.ai/api/p/${encodeURIComponent(brand.subdomain)}` : '';

  const saveReservation = async () => {
    if (!brand?.subdomain) return;
    setSaving(true);
    try {
      await api.put(`/reservation-config?brandSubdomain=${encodeURIComponent(brand.subdomain)}`, { isActive: active, rules });
      showToast('staff.saved');
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <StackLayout title={t(screen.titleKey)} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen">
      {screen.kind === 'agilink' || screen.kind === 'external' ? (
        <article className="ops-connection">
          <p>{t(screen.kind === 'agilink' ? 'staff.agilinkHint' : 'staff.digitalHint')}</p>
          <a href={screen.kind === 'agilink' ? agilinkUrl : cartaUrl}>{screen.kind === 'agilink' ? agilinkUrl : cartaUrl}</a>
        </article>
      ) : error || !brand ? (
        <div role="alert">
          <p>{t('ops.reliability.unavailable')}</p>
          <button type="button" className="ag-btn" onClick={() => setRetry((value) => value + 1)}>{t('ops.reliability.retry')}</button>
        </div>
      ) : !rows ? (
        <p role="status">{t('ops.filters.loadingMessages')}</p>
      ) : (
        <>
          {screen.kind === 'reservation' ? (
            <form className="staff-form" onSubmit={(event) => { event.preventDefault(); void saveReservation(); }}>
              <label><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> {t('staff.reservationActive')}</label>
              <label>{t('staff.maxParty')}<input inputMode="numeric" value={rules.maxPartySize} onChange={(event) => setRules({ ...rules, maxPartySize: Number(event.target.value) || 0 })} /></label>
              <label>{t('staff.minNotice')}<input inputMode="numeric" value={rules.minNoticeHours} onChange={(event) => setRules({ ...rules, minNoticeHours: Number(event.target.value) || 0 })} /></label>
              <label>{t('staff.maxAdvance')}<input inputMode="numeric" value={rules.maxAdvanceDays} onChange={(event) => setRules({ ...rules, maxAdvanceDays: Number(event.target.value) || 0 })} /></label>
              <label>{t('staff.slotInterval')}<input inputMode="numeric" value={rules.slotIntervalMinutes} onChange={(event) => setRules({ ...rules, slotIntervalMinutes: Number(event.target.value) || 0 })} /></label>
              <button type="submit" className="ag-btn" disabled={saving}>{t('staff.save')}</button>
            </form>
          ) : null}
          {rows.length === 0 ? <p>{t('staff.empty')}</p> : rows.map((row) => (
            <article className="ops-connection" key={row.id}>
              <strong>{row.title}</strong>
              {row.detail ? <p>{row.detail}</p> : null}
            </article>
          ))}
        </>
      )}
    </StackLayout>
  );
};

export default StaffScreenPage;
