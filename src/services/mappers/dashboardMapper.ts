import type {
  AgentConnectivityDay,
  ChartPoint,
  DashboardKpi,
  DashboardReport,
  PaymentMethodStat,
  RankItem,
} from '../../types';

/** Fragmentos del GET /dashboard/orderfood usados por Reportes móvil. */
export interface ApiDashboardData {
  metadata?: {
    currencies?: Array<{ code?: string; symbol?: string; name?: string }>;
  };
  salesMetrics?: ApiSalesMetrics | Record<string, ApiSalesMetrics>;
  channelMetrics?: ApiChannelMetrics | Record<string, ApiChannelMetrics>;
  rankings?: ApiRankings | Record<string, ApiRankings>;
  charts?: ApiCharts | Record<string, ApiCharts>;
  reservationMetrics?: {
    totalReservations?: number;
    confirmed?: number;
    cancelled?: number;
    totalGuests?: number;
    cancellationRate?: number;
    growth?: { reservations?: number };
  };
  agentConnectivity?: {
    weekdays?: string[];
    cells?: Array<{
      weekday?: string;
      onlineMinutes?: number;
      scheduledMinutes?: number;
    }>;
  } | null;
}

interface ApiSalesMetrics {
  totalSales?: number;
  totalOrders?: number;
  averageTicket?: number;
  uniqueCustomers?: number;
  paymentMethodChoiceCounts?: Record<string, number>;
  growth?: { sales?: number; orders?: number; customers?: number };
}

interface ApiChannelMetrics {
  chatbot?: {
    sales?: number;
    orders?: number;
    conversionRate?: number;
    conversationsTotal?: number;
    repurchaseRate?: number;
    ordersWithoutHuman?: number;
    userConversionRate?: number;
  };
  cartaDigital?: {
    sales?: number;
    orders?: number;
    conversionRate?: number;
  };
  ordenManual?: {
    sales?: number;
    orders?: number;
    conversionRate?: number;
  };
}

interface ApiRankings {
  restaurants?: Array<{
    id?: string;
    name?: string;
    sales?: number;
    orders?: number;
    growth?: number;
  }>;
  products?: Array<{
    id?: string;
    name?: string;
    sales?: number;
    orders?: number;
    category?: string;
    restaurant?: string;
  }>;
}

interface ApiCharts {
  salesTrend?: Array<{ name?: string; ventas?: number; ordenes?: number }>;
  channelComparison?: Array<{
    name?: string;
    ventas?: number;
    ordenes?: number;
  }>;
}

const PAY_LABEL_KEYS: Record<string, string> = {
  yape: 'reports.payYape',
  plin: 'reports.payPlin',
  card: 'reports.payCard',
  tarjeta: 'reports.payCard',
  credit_card: 'reports.payCard',
  debit_card: 'reports.payCard',
  cash: 'reports.payCash',
  efectivo: 'reports.payCash',
};

function pickCurrencySlice<T>(
  value: T | Record<string, T> | undefined,
  currencies: Array<{ code?: string }> | undefined,
  isLeaf: (v: unknown) => boolean,
): T | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (isLeaf(value)) return value as T;

  const record = value as Record<string, T>;
  const preferred = currencies?.[0]?.code;
  if (preferred && record[preferred]) return record[preferred];

  const keys = Object.keys(record);
  if (keys.length > 0 && keys.every((k) => /^[A-Z]{3}$/i.test(k))) {
    return record[keys[0]];
  }

  return value as T;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function mapPaymentMethods(counts: Record<string, number> | undefined): PaymentMethodStat[] {
  if (!counts) return [];
  const entries = Object.entries(counts)
    .map(([rawKey, rawVal]) => {
      const key = rawKey.trim().toLowerCase();
      const n = Number(rawVal);
      if (!key || !Number.isFinite(n) || n <= 0) return null;
      return [key, n] as const;
    })
    .filter((e): e is readonly [string, number] => e != null);

  const total = entries.reduce((sum, [, n]) => sum + n, 0) || 1;
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([id, amount]) => ({
      id,
      labelKey: PAY_LABEL_KEYS[id] ?? id,
      amount,
      pct: Math.round((amount / total) * 100),
    }));
}

function mapRankRestaurants(
  items: ApiRankings['restaurants'],
): RankItem[] {
  return (items ?? []).map((r, i) => ({
    id: r.id || `r-${i}`,
    nameKey: r.name || '—',
    sales: Math.round(r.sales ?? 0),
    orders: Math.round(r.orders ?? 0),
    growth: typeof r.growth === 'number' ? round1(r.growth) : undefined,
  }));
}

function mapRankProducts(items: ApiRankings['products']): RankItem[] {
  return (items ?? []).map((p, i) => ({
    id: p.id || `p-${i}`,
    nameKey: p.name || '—',
    sales: Math.round(p.sales ?? 0),
    orders: Math.round(p.orders ?? 0),
    categoryKey: p.category || undefined,
  }));
}

function mapSalesTrend(
  points: ApiCharts['salesTrend'],
): ChartPoint[] {
  return (points ?? []).map((p) => ({
    label: p.name || '',
    sales: Math.round(p.ventas ?? 0),
    orders: Math.round(p.ordenes ?? 0),
  }));
}

function mapChannelComparison(channels: ApiChannelMetrics | undefined): ChartPoint[] {
  if (!channels) return [];
  const rows: ChartPoint[] = [];
  if (channels.chatbot) {
    rows.push({
      label: 'WhatsApp',
      sales: Math.round(channels.chatbot.sales ?? 0),
      orders: Math.round(channels.chatbot.orders ?? 0),
    });
  }
  if (channels.cartaDigital) {
    rows.push({
      label: 'Carta digital',
      sales: Math.round(channels.cartaDigital.sales ?? 0),
      orders: Math.round(channels.cartaDigital.orders ?? 0),
    });
  }
  if (channels.ordenManual) {
    rows.push({
      label: 'Manual',
      sales: Math.round(channels.ordenManual.sales ?? 0),
      orders: Math.round(channels.ordenManual.orders ?? 0),
    });
  }
  return rows;
}

function mapAgentConnectivity(
  raw: ApiDashboardData['agentConnectivity'],
): AgentConnectivityDay[] {
  if (!raw?.cells?.length) return [];
  const byDay = new Map<string, { on: number; off: number }>();
  for (const cell of raw.cells) {
    const day = (cell.weekday || '').trim();
    if (!day) continue;
    const scheduled = Math.max(0, cell.scheduledMinutes ?? 0);
    const online = Math.max(0, Math.min(scheduled, cell.onlineMinutes ?? 0));
    const prev = byDay.get(day) ?? { on: 0, off: 0 };
    prev.on += online;
    prev.off += Math.max(0, scheduled - online);
    byDay.set(day, prev);
  }

  const order = raw.weekdays?.length
    ? raw.weekdays
    : Array.from(byDay.keys());

  return order
    .filter((d) => byDay.has(d))
    .map((day) => {
      const { on, off } = byDay.get(day)!;
      return {
        day,
        connectedHours: round1(on / 60),
        disconnectedHours: round1(off / 60),
      };
    });
}

export interface MapDashboardOptions {
  period: 'today' | 'range';
  /** Conversaciones desde GET /brand/:id/conversations/count (opcional). */
  conversationsTotal?: number;
}

/**
 * Normaliza respuesta OrderFood → DashboardReport del móvil.
 */
export function mapDashboardFromApi(
  data: ApiDashboardData | null | undefined,
  options: MapDashboardOptions,
): DashboardReport {
  const currencies = data?.metadata?.currencies;
  const currencySymbol = currencies?.[0]?.symbol?.trim() || 'S/';

  const sales =
    pickCurrencySlice<ApiSalesMetrics>(
      data?.salesMetrics,
      currencies,
      (v) => !!v && typeof v === 'object' && ('totalSales' in v || 'averageTicket' in v),
    ) ?? {};
  const channels =
    pickCurrencySlice<ApiChannelMetrics>(
      data?.channelMetrics,
      currencies,
      (v) => !!v && typeof v === 'object' && 'chatbot' in v,
    ) ?? {};
  const rankings =
    pickCurrencySlice<ApiRankings>(
      data?.rankings,
      currencies,
      (v) => !!v && typeof v === 'object' && ('restaurants' in v || 'products' in v),
    ) ?? {};
  const charts =
    pickCurrencySlice<ApiCharts>(
      data?.charts,
      currencies,
      (v) => !!v && typeof v === 'object' && 'salesTrend' in v,
    ) ?? {};
  const chatbot = channels.chatbot ?? {};
  const reservations = data?.reservationMetrics;
  const salesTrend = mapSalesTrend(charts.salesTrend);

  const salesGrowth = sales.growth?.sales ?? 0;
  const isToday = options.period === 'today';

  const kpis: DashboardKpi[] = [
    {
      id: 'sales',
      labelKey: isToday ? 'reports.salesToday' : 'reports.salesRange',
      value: Math.round(sales.totalSales ?? 0),
      deltaKey: isToday ? 'reports.deltaUp' : 'reports.deltaUpRange',
      deltaValue: Math.abs(Math.round(salesGrowth)),
      deltaDown: salesGrowth < 0,
    },
    {
      id: 'orders',
      labelKey: 'reports.orders',
      value: Math.round(sales.totalOrders ?? 0),
      deltaKey: isToday ? 'reports.deltaOrders' : 'reports.deltaOrdersRange',
      deltaValue: Math.abs(Math.round(sales.growth?.orders ?? 0)),
      deltaDown: (sales.growth?.orders ?? 0) < 0,
    },
    {
      id: 'ticket',
      labelKey: 'reports.avgTicket',
      value: round1(sales.averageTicket ?? 0),
      deltaKey: isToday ? 'reports.deltaTicket' : 'reports.deltaTicketRange',
      deltaValue: 0,
    },
    {
      id: 'cancelled',
      labelKey: 'reports.cancelled',
      value: Math.round(reservations?.cancelled ?? 0),
      deltaKey: isToday ? 'reports.deltaCancelled' : 'reports.deltaCancelledRange',
      deltaValue: 0,
      deltaDown: true,
    },
  ];

  const conversations =
    options.conversationsTotal ??
    Math.round(chatbot.conversationsTotal ?? 0);

  const conversionPct = round1(
    chatbot.userConversionRate ?? chatbot.conversionRate ?? 0,
  );

  return {
    currencySymbol,
    kpis,
    hourlySales: salesTrend.map((p) => p.sales),
    salesTrend,
    channelComparison: mapChannelComparison(channels),
    restaurantRanking: mapRankRestaurants(rankings.restaurants),
    productRanking: mapRankProducts(rankings.products),
    paymentMethods: mapPaymentMethods(sales.paymentMethodChoiceCounts),
    channelMetrics: {
      conversations,
      conversionPct,
      ordersNoHuman: Math.round(chatbot.ordersWithoutHuman ?? sales.totalOrders ?? 0),
      repurchasePct: round1(chatbot.repurchaseRate ?? 0),
      deltas: isToday
        ? undefined
        : {
            conversations: 0,
            conversion: 0,
            ordersNoHuman: Math.round(sales.growth?.orders ?? 0),
            repurchase: 0,
          },
    },
    reservations: {
      total: Math.round(reservations?.totalReservations ?? 0),
      confirmed: Math.round(reservations?.confirmed ?? 0),
      guests: Math.round(reservations?.totalGuests ?? 0),
      cancellationPct: round1(reservations?.cancellationRate ?? 0),
    },
    agentConnectivity: mapAgentConnectivity(data?.agentConnectivity),
  };
}
