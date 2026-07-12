import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { apiMock } from '../services/apiMock';
import type { ChartPoint, DashboardKpi, DashboardReport, RankItem } from '../types';

const CHART_HOURS = ['10', '12', '14', '16', '18', '20', '22'];
const CHART_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
type ReportPeriod = 'today' | 'week';

function maxOf(values: number[]) {
  return Math.max(...values, 1);
}

function LineTrend({ data, valueKey }: { data: ChartPoint[]; valueKey: 'sales' | 'orders' }) {
  const max = maxOf(data.map((d) => d[valueKey]));
  const points = data
    .map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (d[valueKey] / max) * 88;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="reports-line-wrap">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="reports-line-svg" aria-hidden="true">
        <polyline points={points} className="reports-line-path" />
      </svg>
      <div className="reports-line-labels">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function VerticalBars({ data, valueKey, format }: { data: ChartPoint[]; valueKey: 'sales' | 'orders'; format?: (v: number) => string }) {
  const max = maxOf(data.map((d) => d[valueKey]));
  return (
    <div className="reports-vbars">
      {data.map((d) => (
        <div key={d.label} className="reports-vbar-col">
          <span className="reports-vbar-value">{format ? format(d[valueKey]) : d[valueKey]}</span>
          <div className="reports-vbar-track">
            <div className="reports-vbar-fill" style={{ height: `${Math.max(8, (d[valueKey] / max) * 100)}%` }} />
          </div>
          <span className="reports-vbar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}


function RankingBlock({ title, items, t, showCategory }: { title: string; items: RankItem[]; t: (k: string) => string; showCategory?: boolean }) {
  const max = maxOf(items.map((i) => i.sales));
  return (
    <section className="reports-panel ag-enter">
      <div className="reports-chart-head">
        <h2>{title}</h2>
      </div>
      <div className="reports-ranking">
        {items.map((item, idx) => (
          <article key={item.id} className="reports-rank-row">
            <span className="reports-rank-pos">{idx + 1}</span>
            <div className="reports-rank-copy">
              <strong>{t(item.nameKey)}</strong>
              {showCategory && item.categoryKey ? <small>{t(item.categoryKey)}</small> : null}
              <div className="reports-rank-bar">
                <div className="reports-rank-bar-fill" style={{ width: `${Math.max(8, (item.sales / max) * 100)}%` }} />
              </div>
            </div>
            <div className="reports-rank-stats">
              <span>S/ {item.sales.toLocaleString()}</span>
              <small>{item.orders} ped.</small>
              {typeof item.growth === 'number' ? (
                <em className={item.growth < 0 ? 'down' : ''}>{item.growth > 0 ? '+' : ''}{item.growth}%</em>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand } = useApp();
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [reports, setReports] = useState<Partial<Record<ReportPeriod, DashboardReport>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    void Promise.all([
      apiMock.getDashboard(brand.id, 'today'),
      apiMock.getDashboard(brand.id, 'week'),
    ]).then(([today, week]) => {
      setReports({ today, week });
      setLoading(false);
    });
  }, [brand]);

  const report = reports[period] ?? null;

  const changePeriod = (next: ReportPeriod) => {
    if (next === period || !reports[next]) return;
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => void;
    };
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => setPeriod(next));
      return;
    }
    setPeriod(next);
  };

  const sales = report?.kpis.find((k) => k.id === 'sales');
  const others = report?.kpis.filter((k) => k.id !== 'sales') ?? [];
  const TREND_KPI_ORDER = ['orders', 'cancelled', 'ticket'] as const;
  const trendKpis = TREND_KPI_ORDER.map((id) => others.find((k) => k.id === id)).filter(Boolean) as DashboardKpi[];
  const maxBar = useMemo(() => maxOf(report?.hourlySales ?? [1]), [report]);

  const formatValue = (kpi: DashboardKpi) => {
    if (kpi.id === 'sales') return `S/ ${kpi.value.toLocaleString()}`;
    if (kpi.id === 'ticket') return `S/ ${kpi.value}`;
    return String(kpi.value);
  };

  const deltaValue = (kpi: DashboardKpi) => {
    if (period === 'week') return kpi.id === 'orders' ? 21 : kpi.id === 'cancelled' ? 2 : kpi.id === 'ticket' ? 4 : 8;
    return kpi.id === 'orders' ? 5 : kpi.id === 'cancelled' ? 1 : 12;
  };

  const chartLabels = period === 'week' ? CHART_DAYS : CHART_HOURS;

  const payMax = maxOf(report?.paymentMethods.map((p) => p.amount) ?? [1]);

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
          <AppHeader
            showAlerts
            title={t('reports.title')}
            subtitle={t(period === 'week' ? 'reports.subtitleWeek' : 'reports.subtitle', { brand: brand ? t(brand.nameKey) : '' })}
          />
          <div className="ag-body module-body reports-body">
            {loading || !report ? (
              <div className="module-loading">
                <IonSpinner name="crescent" />
              </div>
            ) : (
              <>
                <div className="reports-period ag-enter">
                  <button
                    type="button"
                    className={`reports-period-chip${period === 'today' ? ' active' : ''}`}
                    aria-pressed={period === 'today'}
                    onClick={() => changePeriod('today')}
                  >
                    {t('reports.periodToday')}
                  </button>
                  <button
                    type="button"
                    className={`reports-period-chip${period === 'week' ? ' active' : ''}`}
                    aria-pressed={period === 'week'}
                    onClick={() => changePeriod('week')}
                  >
                    {t('reports.periodWeek')}
                  </button>
                </div>

                {sales ? (
                  <section className="reports-hero ag-enter">
                    <span className="reports-hero-label">{t(sales.labelKey)}</span>
                    <strong className="reports-hero-value">{formatValue(sales)}</strong>
                    <span className={`reports-hero-delta${sales.deltaDown ? ' reports-hero-delta--down' : ''}`}>
                      {t(sales.deltaKey, { value: 12 })}
                    </span>
                  </section>
                ) : null}


                <section className="reports-metrics-row ag-enter">
                  <article className="reports-metric-card">
                    <span>{t('reports.conversations')}</span>
                    <strong>{report.channelMetrics.conversations}</strong>
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.conversion')}</span>
                    <strong>{report.channelMetrics.conversionPct}%</strong>
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.ordersNoHuman')}</span>
                    <strong>{report.channelMetrics.ordersNoHuman}</strong>
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.repurchase')}</span>
                    <strong>{report.channelMetrics.repurchasePct}%</strong>
                  </article>
                </section>

                <section className="reports-panel reports-trend-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.salesTrend')}</h2>
                  </div>
                  <div className="reports-trend-kpis">
                    {trendKpis.map((kpi) => (
                      <article key={kpi.id} className={`reports-kpi-card reports-kpi-card--${kpi.id}`}>
                        <span className="reports-kpi-label">{t(kpi.labelKey)}</span>
                        <strong className="reports-kpi-value">{formatValue(kpi)}</strong>
                        <span className={`reports-kpi-delta${kpi.deltaDown ? ' reports-kpi-delta--down' : ''}`}>
                          {t(kpi.deltaKey, { value: deltaValue(kpi) })}
                        </span>
                      </article>
                    ))}
                  </div>
                  <LineTrend data={report.salesTrend} valueKey="sales" />
                </section>

                <section className="reports-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.ordersTrend')}</h2>
                  </div>
                  <VerticalBars data={report.salesTrend} valueKey="orders" />
                </section>

                <section className="reports-chart ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t(period === 'week' ? 'reports.chartTitleWeek' : 'reports.chartTitle')}</h2>
                  </div>
                  <div className="reports-chart-bars" aria-hidden="true">
                    {report.hourlySales.map((height, idx) => (
                      <div key={idx} className="reports-chart-col">
                        <div
                          className="reports-chart-bar"
                          style={{ height: `${Math.max(12, (height / maxBar) * 100)}%` }}
                        />
                        <span className="reports-chart-hour">{chartLabels[idx] ?? ''}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="reports-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.channelComparison')}</h2>
                  </div>
                  <VerticalBars data={report.channelComparison} valueKey="sales" format={(v) => `S/ ${v}`} />
                </section>

                <section className="reports-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.paymentMethods')}</h2>
                  </div>
                  <div className="reports-hbars">
                    {report.paymentMethods.map((item) => (
                      <div key={item.id} className="reports-hbar-row">
                        <div className="reports-hbar-meta">
                          <span>{t(item.labelKey)}</span>
                          <small>{item.pct}%</small>
                        </div>
                        <div className="reports-hbar-track">
                          <div className="reports-hbar-fill" style={{ width: `${Math.max(6, (item.amount / payMax) * 100)}%` }} />
                        </div>
                        <strong className="reports-hbar-amount">S/ {item.amount.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <RankingBlock title={t('reports.restaurantRanking')} items={report.restaurantRanking} t={t} />
                <RankingBlock title={t('reports.productRanking')} items={report.productRanking} t={t} showCategory />

                <section className="reports-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.reservations')}</h2>
                  </div>
                  <div className="reports-res-grid">
                    <article><span>{t('reports.resTotal')}</span><strong>{report.reservations.total}</strong></article>
                    <article><span>{t('reports.resConfirmed')}</span><strong>{report.reservations.confirmed}</strong></article>
                    <article><span>{t('reports.resGuests')}</span><strong>{report.reservations.guests}</strong></article>
                    <article><span>{t('reports.resCancellation')}</span><strong>{report.reservations.cancellationPct}%</strong></article>
                  </div>
                </section>

                <section className="reports-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.agentConnectivity')}</h2>
                  </div>
                  <div className="reports-connectivity">
                    {report.agentConnectivity.map((day) => {
                      const total = day.connectedHours + day.disconnectedHours || 1;
                      const connectedPct = (day.connectedHours / total) * 100;
                      return (
                        <div key={day.day} className="reports-connect-row">
                          <span className="reports-connect-day">{day.day}</span>
                          <div className="reports-connect-track">
                            <div className="reports-connect-on" style={{ width: `${connectedPct}%` }} />
                            <div className="reports-connect-off" style={{ width: `${100 - connectedPct}%` }} />
                          </div>
                          <span className="reports-connect-hours">{day.connectedHours}h</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default ReportsPage;
