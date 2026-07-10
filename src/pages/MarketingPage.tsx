import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { chatbubbleOutline, megaphoneOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { FilterChips } from '../components/FilterChips';
import { useApp } from '../context/AppContext';
import { useModuleNav } from '../hooks/useModuleNav';
import { apiMock } from '../services/apiMock';
import type { ClientSegment, CrmClient } from '../types';

type SegmentFilter = 'all' | ClientSegment;

const MarketingPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const { breadcrumbs, onBack } = useModuleNav();
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<SegmentFilter>('all');

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    void apiMock.getClients(brand.id).then((data) => {
      setClients(data);
      setLoading(false);
    });
  }, [brand]);

  const chips = useMemo(
    () => [
      { id: 'all', label: t('marketing.segments.all') },
      { id: 'vip', label: t('marketing.segments.vip') },
      { id: 'frequent', label: t('marketing.segments.frequent') },
      { id: 'inactive', label: t('marketing.segments.inactive') },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const matchSeg = segment === 'all' || c.segment === segment;
      const name = t(c.nameKey).toLowerCase();
      const matchQuery = !q || name.includes(q) || c.phone.includes(q);
      return matchSeg && matchQuery;
    });
  }, [clients, segment, query, t]);

  const subtitle = brand ? `${t(brand.nameKey)} · ${t('marketing.subtitle')}` : '';

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
        <AppHeader
          onBack={onBack}
          breadcrumbs={breadcrumbs}
          showAlerts
          title={t('marketing.title')}
          subtitle={subtitle}
          avatar={brand?.initials}
          search={{
            value: query,
            placeholder: t('marketing.search'),
            onChange: setQuery,
          }}
        />
        <div className="ag-body module-body ag-page-stack">
          <FilterChips chips={chips} value={segment} onChange={(id) => setSegment(id as SegmentFilter)} />

          {loading ? (
            <div className="module-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="module-empty">{t('marketing.empty')}</p>
          ) : (
            <div className="client-list">
              {filtered.map((client) => (
                <article key={client.id} className="client-card">
                  <div className="client-card__head">
                    <div className="client-card__avatar">{client.initials}</div>
                    <div>
                      <h3>{t(client.nameKey)}</h3>
                      <p className="client-card__phone">{client.phone}</p>
                    </div>
                    {client.segment === 'vip' ? (
                      <span className="ag-pill ag-pill--new">{t('marketing.badgeVip')}</span>
                    ) : null}
                  </div>
                  <div className="client-card__stats">
                    <div className="client-card__stat">
                      <span>{t('marketing.ordersTotal')}</span>
                      <strong>{client.ordersCount}</strong>
                    </div>
                    <div className="client-card__stat client-card__stat--accent">
                      <span>{t('marketing.spentTotal')}</span>
                      <strong>S/ {client.totalSpent.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                  <div className="client-card__actions">
                    <button type="button" className="ag-btn ag-btn--primary client-card__campaign" onClick={() => showToast('toast.comingSoon')}>
                      <IonIcon icon={megaphoneOutline} />
                      {t('marketing.campaign')}
                    </button>
                    <button type="button" className="client-card__chat" aria-label={t('marketing.chat')} onClick={() => showToast('toast.comingSoon')}>
                      <IonIcon icon={chatbubbleOutline} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default MarketingPage;
