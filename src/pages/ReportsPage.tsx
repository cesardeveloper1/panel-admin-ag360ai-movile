import { useEffect, useMemo, useRef, useState } from 'react';
import { IonContent, IonDatetime, IonModal, IonPage, IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { apiMock } from '../services/apiMock';
import type { ChartPoint, DashboardKpi, DashboardReport, RankItem } from '../types';

const CHART_HOURS = ['10', '12', '14', '16', '18', '20', '22'];
const CHART_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
type ReportPeriod = 'today' | 'range';

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeDays(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
}

function formatRangeDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function maxOf(values: number[]) {
  return Math.max(...values, 1);
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
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarValue, setCalendarValue] = useState(() => toLocalIsoDate(new Date()));
  const datetimeRef = useRef<HTMLIonDatetimeElement>(null);
  const lastReportScrollTop = useRef(0);

  const calendarMonthTitle = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })
    .format(calendarMonth);
  const today = new Date();
  const calendarAtCurrentMonth = calendarMonth.getFullYear() === today.getFullYear()
    && calendarMonth.getMonth() === today.getMonth();

  const syncCalendarHeader = () => {
    const datetime = datetimeRef.current as (HTMLIonDatetimeElement & {
      workingParts?: { month?: number; year?: number };
    }) | null;
    const month = datetime?.workingParts?.month;
    const year = datetime?.workingParts?.year;
    if (month && year) setCalendarMonth(new Date(year, month - 1, 1));
  };

  const moveCalendar = (direction: 'previous' | 'next') => {
    const buttons = datetimeRef.current?.shadowRoot?.querySelectorAll<HTMLIonButtonElement>('.calendar-next-prev ion-button');
    const button = buttons?.[direction === 'previous' ? 0 : 1];
    if (!button || button.disabled) return;
    button.click();
    setCalendarMonth((visibleMonth) => new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + (direction === 'previous' ? -1 : 1),
      1,
    ));
  };

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    void Promise.all([
      apiMock.getDashboard(brand.id, 'today'),
      apiMock.getDashboard(brand.id, 'range', 7),
    ]).then(([today, range]) => {
      setReports({ today, range });
      setLoading(false);
    });
  }, [brand]);

  useEffect(() => {
    if (!rangeOpen) return;
    const timer = window.setTimeout(() => {
      const shadow = datetimeRef.current?.shadowRoot;
      if (!shadow || shadow.querySelector('[data-agiliza-calendar-style]')) return;
      const style = document.createElement('style');
      style.dataset.agilizaCalendarStyle = 'true';
      style.textContent = '.calendar-action-buttons { display: none !important; }';
      shadow.appendChild(style);
      syncCalendarHeader();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [rangeOpen]);

  useEffect(() => () => document.body.classList.remove('ag-reports-header-hidden'), []);

  const handleReportScroll = (scrollTop: number) => {
    const scrollingDown = scrollTop > lastReportScrollTop.current + 4;
    const scrollingUp = scrollTop < lastReportScrollTop.current - 4;

    if (scrollTop <= 24 || scrollingUp) {
      document.body.classList.remove('ag-reports-header-hidden');
    } else if (scrollingDown && scrollTop > 72) {
      document.body.classList.add('ag-reports-header-hidden');
    }

    lastReportScrollTop.current = Math.max(0, scrollTop);
  };

  const report = reports[period] ?? null;

  const updateWithTransition = (update: () => void) => {
    const transitionDocument = document as Document & {
      startViewTransition?: (update: () => void) => void;
    };
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(update);
      return;
    }
    update();
  };

  const showToday = () => {
    if (period === 'today') return;
    updateWithTransition(() => setPeriod('today'));
  };

  const openRangePicker = () => {
    setCalendarMonth(new Date());
    setCalendarValue(toLocalIsoDate(new Date()));
    setRangeOpen(true);
  };

  const onRangeDateChange = (rawValue: string | string[] | null | undefined) => {
    const selected = (Array.isArray(rawValue) ? rawValue[0] : rawValue)?.slice(0, 10);
    if (!selected) return;
    setCalendarValue(selected);

    if (!rangeStart || rangeEnd) {
      setRangeStart(selected);
      setRangeEnd(null);
      return;
    }

    if (selected < rangeStart) {
      setRangeStart(selected);
      setRangeEnd(rangeStart);
      return;
    }

    setRangeEnd(selected);
  };

  const applyRange = () => {
    if (!brand || !rangeStart) return;
    const effectiveEnd = rangeEnd ?? rangeStart;
    const days = rangeDays(rangeStart, effectiveEnd);
    void apiMock.getDashboard(brand.id, 'range', days, rangeStart, effectiveEnd).then((range) => {
      updateWithTransition(() => {
        setReports((current) => ({ ...current, range }));
        setPeriod('range');
        setRangeOpen(false);
      });
    });
  };

  const highlightedRangeDates = useMemo(() => {
    if (!rangeStart) return [];
    const end = rangeEnd ?? rangeStart;
    const cursor = new Date(`${rangeStart}T12:00:00`);
    const endDate = new Date(`${end}T12:00:00`);
    const dates = [];

    while (cursor <= endDate) {
      const date = toLocalIsoDate(cursor);
      const isBoundary = date === rangeStart || date === end;
      dates.push({
        date,
        textColor: isBoundary ? '#ffffff' : '#5f2fc5',
        backgroundColor: isBoundary ? '#8746ff' : 'rgba(135, 70, 255, 0.16)',
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }, [rangeStart, rangeEnd]);

  const sales = report?.kpis.find((k) => k.id === 'sales');
  const cancelled = report?.kpis.find((k) => k.id === 'cancelled');
  const ticket = report?.kpis.find((k) => k.id === 'ticket');
  const recurringPaymentMethod = report?.paymentMethods.reduce((mostUsed, method) => (
    method.pct > mostUsed.pct ? method : mostUsed
  ));
  const insights = [
    { id: 'complaints', labelKey: 'reports.complaintsHuman', value: 8, delta: 7, down: true },
    { id: 'cancelled', labelKey: 'reports.cancelled', value: cancelled?.value ?? 0, delta: 3, down: true },
    { id: 'scheduled', labelKey: 'reports.scheduledOrders', value: 23, delta: 12 },
    { id: 'delivery', labelKey: 'reports.deliveryOrdersPct', value: '68%', delta: 8 },
    { id: 'pickup', labelKey: 'reports.pickupOrdersPct', value: '32%', delta: 5 },
    {
      id: 'payment',
      labelKey: 'reports.recurringPaymentMethod',
      value: recurringPaymentMethod ? `${recurringPaymentMethod.pct}% ${t(recurringPaymentMethod.labelKey)}` : '—',
      delta: 6,
    },
  ];
  const maxBar = useMemo(() => maxOf(report?.hourlySales ?? [1]), [report]);

  const formatValue = (kpi: DashboardKpi) => {
    if (kpi.id === 'sales') return `S/ ${kpi.value.toLocaleString()}`;
    if (kpi.id === 'ticket') return `S/ ${kpi.value}`;
    return String(kpi.value);
  };

  const chartLabels = period === 'range' ? CHART_DAYS : CHART_HOURS;

  const payMax = maxOf(report?.paymentMethods.map((p) => p.amount) ?? [1]);

  return (
    <IonPage>
      <IonContent
        className="ag-screen"
        scrollEvents
        onIonScroll={(event) => handleReportScroll(event.detail.scrollTop)}
      >
        <AppShell>
          <AppHeader
            centeredCompact
            title={t('reports.title')}
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
                    onClick={showToday}
                  >
                    {t('reports.periodToday')}
                  </button>
                  <button
                    type="button"
                    className={`reports-period-chip${period === 'range' ? ' active' : ''}`}
                    aria-pressed={period === 'range'}
                    onClick={openRangePicker}
                  >
                    {t('reports.periodRange')}
                  </button>
                </div>

                {period === 'range' ? (
                  <button type="button" className="reports-range-summary" onClick={openRangePicker}>
                    {rangeStart ? formatRangeDate(rangeStart) : ''}
                    {rangeStart && rangeEnd && rangeEnd !== rangeStart ? ` — ${formatRangeDate(rangeEnd)}` : ''}
                  </button>
                ) : null}

                {sales ? (
                  <section className="reports-hero ag-enter">
                    <span className="reports-hero-label">{t(sales.labelKey)}</span>
                    <strong className="reports-hero-value">{formatValue(sales)}</strong>
                    <span className={`reports-hero-delta${sales.deltaDown ? ' reports-hero-delta--down' : ''}`}>
                      {t(sales.deltaKey, { value: sales.deltaValue ?? 12 })}
                    </span>
                  </section>
                ) : null}


                <section className="reports-metrics-row ag-enter">
                  <article className="reports-metric-card">
                    <span>{t('reports.conversations')}</span>
                    <strong>{report.channelMetrics.conversations}</strong>
                    {period === 'range' ? <small>{t('reports.vsPreviousMonth', { value: report.channelMetrics.deltas?.conversations ?? 0 })}</small> : null}
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.conversion')}</span>
                    <strong>{report.channelMetrics.conversionPct}%</strong>
                    {period === 'range' ? <small>{t('reports.vsPreviousMonth', { value: report.channelMetrics.deltas?.conversion ?? 0 })}</small> : null}
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.orders')}</span>
                    <strong>{report.channelMetrics.ordersNoHuman}</strong>
                    {period === 'range' ? <small>{t('reports.vsPreviousMonth', { value: report.channelMetrics.deltas?.ordersNoHuman ?? 0 })}</small> : null}
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.repurchase')}</span>
                    <strong>{report.channelMetrics.repurchasePct}%</strong>
                    {period === 'range' ? <small>{t('reports.vsPreviousMonth', { value: report.channelMetrics.deltas?.repurchase ?? 0 })}</small> : null}
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.avgTicket')}</span>
                    <strong>S/ {ticket?.value ?? 0}</strong>
                    {period === 'range' ? <small>{t('reports.vsPreviousMonth', { value: ticket?.deltaValue ?? 4 })}</small> : null}
                  </article>
                  <article className="reports-metric-card">
                    <span>{t('reports.generatedReservations')}</span>
                    <strong>{report.reservations.total}</strong>
                    {period === 'range' ? <small>{t('reports.vsPreviousMonth', { value: 8 })}</small> : null}
                  </article>
                </section>

                <section className="reports-panel reports-trend-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.insights')}</h2>
                  </div>
                  <div className="reports-insights-grid">
                    {insights.map((insight) => (
                      <article key={insight.id} className="reports-kpi-card">
                        <span className="reports-kpi-label">{t(insight.labelKey)}</span>
                        <strong className="reports-kpi-value">{insight.value}</strong>
                        <span className={`reports-kpi-delta${insight.down ? ' reports-kpi-delta--down' : ''}`}>
                          {period === 'range'
                            ? t('reports.vsPreviousMonth', { value: insight.delta })
                            : `+${insight.delta}%`}
                        </span>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="reports-panel ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t('reports.ordersTrend')}</h2>
                  </div>
                  <VerticalBars data={report.salesTrend} valueKey="orders" />
                </section>

                <section className="reports-chart ag-enter">
                  <div className="reports-chart-head">
                    <h2>{t(period === 'range' ? 'reports.chartTitleRange' : 'reports.chartTitle')}</h2>
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

      <IonModal
        isOpen={rangeOpen}
        onDidDismiss={() => setRangeOpen(false)}
        className="reports-range-modal"
      >
        <div className="reports-range-picker">
          <div className="reports-range-picker__month">
            <button type="button" onClick={() => moveCalendar('previous')} aria-label="Mes anterior">‹</button>
            <strong>{calendarMonthTitle}</strong>
            <button
              type="button"
              onClick={() => moveCalendar('next')}
              aria-label="Mes siguiente"
              disabled={calendarAtCurrentMonth}
            >
              ›
            </button>
          </div>
          {rangeStart ? (
            <div className="reports-range-picker__selection" aria-live="polite">
              {formatRangeDate(rangeStart)}
              {rangeEnd && rangeEnd !== rangeStart ? ` — ${formatRangeDate(rangeEnd)}` : ''}
            </div>
          ) : null}
          <IonDatetime
            ref={datetimeRef}
            presentation="date"
            locale="es-PE"
            value={calendarValue}
            highlightedDates={highlightedRangeDates}
            max={toLocalIsoDate(new Date())}
            onIonChange={(event) => onRangeDateChange(event.detail.value)}
          />
          {rangeStart ? (
            <button className="reports-range-picker__apply" type="button" onClick={applyRange}>
              Aplicar
            </button>
          ) : null}
        </div>
      </IonModal>
    </IonPage>
  );
};

export default ReportsPage;
