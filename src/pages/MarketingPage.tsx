import { useEffect, useMemo, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { chatbubbleOutline, peopleOutline, searchOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FilterChips } from '../components/FilterChips';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { CHATS_PATH } from '../navigation/appRouteRegistry';
import { apiFacade } from '../services/apiFacade';
import type { CustomerAnalyticsCustomer, CustomerType } from '../services/customerService';

type SegmentFilter = 'all' | CustomerType;

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || '?';
}

const MarketingPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand } = useApp();
  const brandId = brand?.id;
  const history = useHistory();
  const [clients, setClients] = useState<CustomerAnalyticsCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [segment, setSegment] = useState<SegmentFilter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const requestIdRef = useRef(0);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!searchOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [searchOpen]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!brandId) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void apiFacade.getCustomerAnalytics({
      brandId,
      page: 1,
      limit: 100,
      search: debouncedQuery || undefined,
      customerType: segment === 'all' ? undefined : segment,
      sortBy: 'orderCount',
      sortDirection: 'desc',
    }).then((data) => {
      if (requestId !== requestIdRef.current) return;
      setClients(data.customers);
    }).catch(() => {
      if (requestId !== requestIdRef.current) return;
      setClients([]);
      setError(t('marketing.error'));
    }).finally(() => {
      if (requestId === requestIdRef.current) setLoading(false);
    });
  }, [brandId, debouncedQuery, segment, t]);

  const chips = useMemo(
    () => [
      { id: 'all', label: t('marketing.segments.all') },
      { id: 'VIP', label: t('marketing.segments.vip') },
      { id: 'Regular', label: t('marketing.segments.regular') },
      { id: 'New', label: t('marketing.segments.new') },
    ],
    [t],
  );

  const customerTypeLabel = (type: CustomerType) => t(`marketing.types.${type.toLowerCase()}`);

  return (
    <StackLayout
      title={t('marketing.title')}
      showAlerts
      trailing={(
        <div className="ops-tools" ref={searchRef}>
          <button
            className="ops-tool-btn"
            type="button"
            aria-label={t('marketing.search')}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <IonIcon icon={searchOutline} aria-hidden="true" />
          </button>
          {searchOpen ? (
            <div className="ops-filter-popover" role="dialog" aria-label={t('marketing.search')}>
              <input
                className="carta-search"
                type="search"
                value={query}
                placeholder={t('marketing.search')}
                aria-label={t('marketing.search')}
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      )}
    >
      <FilterChips chips={chips} value={segment} onChange={(id) => setSegment(id as SegmentFilter)} />

      {loading ? (
        <div className="module-loading">
          <IonSpinner name="crescent" />
        </div>
      ) : error ? (
        <p className="module-empty">{error}</p>
      ) : clients.length === 0 ? (
        <div className="clients-empty-state" role="status">
          <IonIcon icon={peopleOutline} aria-hidden="true" />
          <p>{t('marketing.empty')}</p>
        </div>
      ) : (
        <div className="client-list">
          {clients.map((client) => (
            <article key={client.documentId} className="client-card">
              <div className="client-card__head">
                <div className="client-card__avatar">{initialsFromName(client.name)}</div>
                <div>
                  <h3>{client.name}</h3>
                  <p className="client-card__phone">{client.phone}</p>
                </div>
                <span className="ag-pill ag-pill--new">{customerTypeLabel(client.customerType)}</span>
              </div>
              <div className="client-card__stats">
                <div className="client-card__stat">
                  <span>{t('marketing.ordersTotal')}</span>
                  <strong>{client.orderCount}</strong>
                </div>
                <div className="client-card__stat client-card__stat--accent">
                  <span>{t('marketing.spentTotal')}</span>
                  <strong>S/ {client.totalAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
              <div className="client-card__actions">
                <button
                  type="button"
                  className="client-card__chat"
                  aria-label={t('marketing.chat')}
                  onClick={() => history.push(`${CHATS_PATH}?phone=${encodeURIComponent(client.phone)}`)}
                >
                  <IonIcon icon={chatbubbleOutline} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </StackLayout>
  );
};

export default MarketingPage;
