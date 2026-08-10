import { LOGO_COLOR_LOCAL } from '../constants/assets';
import type {
  BranchLocation,
  Brand,
  CatalogProduct,
  CrmClient,
  DashboardKpi,
  NotificationItem,
  Order,
  OrderStatus,
  UserSession,
  BrandConfig,
  DashboardReport,
  RankItem,
  ChatConversation,
  ChatMessage,
} from '../types';

export {
  getKanbanGroup,
  getKanbanSubState,
  getKitchenAction,
} from '../utils/orderKanban';
import type { OrdersListFilters } from './ordersQuery';

const STORAGE_KEY = 'ag360-orders-v1';
const PRODUCTS_KEY = 'ag360-products-v1';
const BRANDS_KEY = 'ag360-brands-v1';
const BRAND_CONFIG_KEY = 'ag360-brand-config-v1';

const initialOrders: Order[] = [
  {
    id: 'A-2850',
    customerKey: 'customers.pedro',
    status: 'pre_order',
    channel: 'whatsapp',
    deliveryType: 'delivery',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.ceviche', price: 24 }],
    total: 24,
  },
  {
    id: 'A-2847',
    customerKey: 'customers.lucia',
    status: 'accepted',
    channel: 'whatsapp',
    deliveryType: 'delivery',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    needsHuman: true,
    items: [{ qty: 2, nameKey: 'products.ceviche', price: 24 }],
    total: 68,
  },
  {
    id: 'A-2848',
    customerKey: 'customers.carlos',
    status: 'accepted',
    channel: 'web',
    deliveryType: 'pickup',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.arrozMariscos', price: 42 }],
    total: 42,
  },
  {
    id: 'A-2844',
    customerKey: 'customers.ana',
    status: 'in_kitchen',
    channel: 'whatsapp',
    deliveryType: 'delivery',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.comboFamiliar', price: 95 }],
    total: 95,
    minutesInKitchen: 18,
  },
  {
    id: 'A-2842',
    customerKey: 'customers.lucia',
    status: 'ready',
    channel: 'whatsapp',
    deliveryType: 'pickup',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.arrozMariscos', price: 42 }],
    total: 42,
  },
  {
    id: 'B-1102',
    customerKey: 'customers.pedro',
    status: 'accepted',
    channel: 'whatsapp',
    deliveryType: 'pickup',
    brandId: 'anticuchos',
    locationKey: 'locations.miraflores',
    items: [{ qty: 2, nameKey: 'products.anticucho', price: 18 }],
    total: 84,
  },
  {
    id: 'B-1100',
    customerKey: 'customers.carlos',
    status: 'in_kitchen',
    channel: 'web',
    deliveryType: 'delivery',
    brandId: 'anticuchos',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.comboAnticuchos', price: 95 }],
    total: 95,
    minutesInKitchen: 9,
  },
  {
    id: 'A-2841',
    customerKey: 'customers.pedro',
    status: 'on_the_way',
    channel: 'whatsapp',
    deliveryType: 'delivery',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.ceviche', price: 55 }],
    total: 55,
  },
  {
    id: 'A-2830',
    customerKey: 'customers.ana',
    status: 'delivered',
    channel: 'whatsapp',
    deliveryType: 'delivery',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    items: [{ qty: 1, nameKey: 'products.ceviche', price: 42 }],
    total: 42,
  },
];

const demoCustomers = ['customers.pedro', 'customers.lucia', 'customers.carlos', 'customers.ana'] as const;
const demoItems = [
  { nameKey: 'products.ceviche', price: 42 },
  { nameKey: 'products.arrozMariscos', price: 42 },
  { nameKey: 'products.comboFamiliar', price: 95 },
] as const;

const additionalPacificoOrders: Order[] = Array.from({ length: 93 }, (_, index) => {
  const item = demoItems[index % demoItems.length];
  const customerKey = demoCustomers[index % demoCustomers.length];
  const isNew = index < 31;
  const isProcessing = index >= 31 && index < 61;
  const newStage = index % 3;
  const processingStatuses: OrderStatus[] = ['in_kitchen', 'ready', 'on_the_way'];
  const status: OrderStatus = isNew
    ? newStage === 0 ? 'pre_order' : 'accepted'
    : isProcessing ? processingStatuses[index % 3] : 'delivered';
  const qty = (index % 3) + 1;

  return {
    id: `A-${3001 + index}`,
    customerKey,
    status,
    channel: 'whatsapp',
    deliveryType: index % 2 === 0 ? 'delivery' : 'pickup',
    brandId: 'pacifico',
    locationKey: 'locations.miraflores',
    needsHuman: isNew && newStage === 2,
    phone: ['+51955111222', '+51999888777', '+51912345678', '+51988777666'][index % 4],
    paymentMethod: (['yape', 'card', 'cash', 'plin'] as const)[index % 4],
    items: [{ qty, nameKey: item.nameKey, price: item.price }],
    total: qty * item.price,
    minutesInKitchen: status === 'in_kitchen' ? 5 + (index % 15) : undefined,
  };
});

initialOrders.push(...additionalPacificoOrders);

const demoFirstNames = ['Sofía', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Sebastián', 'Luciana', 'Diego', 'Mía', 'Nicolás', 'Renata', 'Joaquín', 'Alessia', 'Thiago', 'Mariana'];
const demoLastNames = ['García', 'Ramírez', 'Torres', 'Mendoza', 'Flores', 'Castillo', 'Vargas'];

initialOrders
  .filter((order) => order.brandId === 'pacifico')
  .forEach((order, index) => {
    order.customerName = `${demoFirstNames[index % demoFirstNames.length]} ${demoLastNames[Math.floor(index / demoFirstNames.length)]}`;
    order.leadTag = index < 20 ? 'new' : index < 90 ? 'recurring' : 'vip';
    const createdAt = new Date();
    order.createdAt = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
  });

const initialProducts: CatalogProduct[] = [
  { id: 'p1', brandId: 'pacifico', nameKey: 'menu.items.ceviche', category: 'starters', price: 42, active: true, emoji: '🐟' },
  { id: 'p2', brandId: 'pacifico', nameKey: 'menu.items.arrozMariscos', category: 'mains', price: 35, active: true, emoji: '🍚' },
  { id: 'p3', brandId: 'pacifico', nameKey: 'menu.items.comboFamiliar', category: 'mains', price: 95, active: true, emoji: '🥘' },
  { id: 'p4', brandId: 'pacifico', nameKey: 'menu.items.chicha', category: 'drinks', price: 15, active: true, emoji: '🥤' },
  { id: 'p5', brandId: 'pacifico', nameKey: 'menu.items.causa', category: 'starters', price: 28, active: false, soldOut: true, emoji: '🥔' },
  { id: 'p6', brandId: 'pacifico', nameKey: 'menu.items.tresLeches', category: 'desserts', price: 18, active: true, emoji: '🍰' },
  { id: 'a1', brandId: 'anticuchos', nameKey: 'menu.items.anticucho', category: 'mains', price: 18, active: true, emoji: '🍢' },
  { id: 'a2', brandId: 'anticuchos', nameKey: 'menu.items.corazon', category: 'mains', price: 22, active: true, emoji: '❤️' },
  { id: 'a3', brandId: 'anticuchos', nameKey: 'menu.items.comboAnticuchos', category: 'mains', price: 55, active: true, emoji: '🍽️' },
  { id: 'a4', brandId: 'anticuchos', nameKey: 'menu.items.chicha', category: 'drinks', price: 12, active: true, emoji: '🥤' },
];

const clients: CrmClient[] = [
  { id: 'c1', brandId: 'pacifico', nameKey: 'crm.anaGarcia', phone: '+51 987 654 321', ordersCount: 12, totalSpent: 1450, segment: 'vip', initials: 'AG' },
  { id: 'c2', brandId: 'pacifico', nameKey: 'crm.carlosMendoza', phone: '+51 912 345 678', ordersCount: 8, totalSpent: 890.5, segment: 'frequent', initials: 'CM' },
  { id: 'c3', brandId: 'pacifico', nameKey: 'crm.luciaRojas', phone: '+51 999 888 777', ordersCount: 3, totalSpent: 120, segment: 'inactive', initials: 'LR' },
  { id: 'c4', brandId: 'pacifico', nameKey: 'customers.pedro', phone: '+51 955 111 222', ordersCount: 5, totalSpent: 420, segment: 'regular', initials: 'PS' },
  { id: 'c5', brandId: 'anticuchos', nameKey: 'crm.carlosMendoza', phone: '+51 912 345 678', ordersCount: 6, totalSpent: 540, segment: 'frequent', initials: 'CM' },
  { id: 'c6', brandId: 'anticuchos', nameKey: 'customers.ana', phone: '+51 988 777 666', ordersCount: 2, totalSpent: 95, segment: 'inactive', initials: 'AT' },
];

const seedLocations: BranchLocation[] = [
  { id: 'l1', brandId: 'pacifico', nameKey: 'locations.central', addressKey: 'locations.addressCentral', phone: '+51 1 445 7788', active: true },
  { id: 'l2', brandId: 'pacifico', nameKey: 'locations.miraflores', addressKey: 'locations.addressMiraflores', phone: '+51 1 446 9900', active: true },
  { id: 'l3', brandId: 'pacifico', nameKey: 'locations.sanIsidro', addressKey: 'locations.addressSanIsidro', phone: '+51 1 447 1122', active: false },
  { id: 'l4', brandId: 'anticuchos', nameKey: 'locations.central', addressKey: 'locations.addressAnticuchos', phone: '+51 1 550 3344', active: true },
];

function loadLocations(): BranchLocation[] {
  try {
    const raw = localStorage.getItem('ag360-locations-v1');
    if (raw) return JSON.parse(raw) as BranchLocation[];
  } catch { /* ignore */ }
  return structuredClone(seedLocations);
}

function saveLocations(next: BranchLocation[]) {
  localStorage.setItem('ag360-locations-v1', JSON.stringify(next));
}

const seedBrands: Brand[] = [
  { id: 'pacifico', initials: 'CP', nameKey: 'brands.pacifico', locations: 3, ordersToday: 12 },
  { id: 'anticuchos', initials: 'AB', nameKey: 'brands.anticuchos', locations: 1, ordersToday: 4 },
];

function loadBrands() {
  try {
    const raw = localStorage.getItem(BRANDS_KEY);
    if (raw) return JSON.parse(raw) as Brand[];
  } catch { /* ignore */ }
  return structuredClone(seedBrands);
}

function saveBrands(next: Brand[]) {
  localStorage.setItem(BRANDS_KEY, JSON.stringify(next));
}

function brandInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || 'NB';
}


function mockSalesForDate(brandId: string, date: Date) {
  const brandOffset = [...brandId].reduce((total, character) => total + character.charCodeAt(0), 0) % 420;
  const monthIndex = date.getFullYear() * 12 + date.getMonth() - 24_000;
  return Math.round(2_650 + brandOffset + monthIndex * 32 + date.getDate() * 29 + date.getDay() * 73);
}

function salesBetween(brandId: string, start: string, end: string, previousMonth = false) {
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  let total = 0;

  while (cursor <= last) {
    const saleDate = new Date(cursor);
    if (previousMonth) {
      const targetMonth = saleDate.getMonth() - 1;
      const targetYear = targetMonth < 0 ? saleDate.getFullYear() - 1 : saleDate.getFullYear();
      const normalizedMonth = (targetMonth + 12) % 12;
      const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      saleDate.setFullYear(targetYear, normalizedMonth, Math.min(saleDate.getDate(), lastDay));
    }
    total += mockSalesForDate(brandId, saleDate);
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function buildDashboard(
  brandId: string,
  period: 'today' | 'range' = 'today',
  rangeDays = 7,
  rangeStart?: string,
  rangeEnd?: string,
): DashboardReport {
  const orders = loadOrders().filter((o) => o.brandId === brandId);
  const cloned = structuredClone(kpis);
  cloned[1] = { ...cloned[1], value: orders.length + 43 };

  const dailyReport: DashboardReport = {
    kpis: cloned,
    hourlySales: [35, 55, 80, 65, 90, 70, 45],
    salesTrend: [
      { label: 'Lun', sales: 2800, orders: 32 },
      { label: 'Mar', sales: 3100, orders: 38 },
      { label: 'Mié', sales: 3400, orders: 41 },
      { label: 'Jue', sales: 3200, orders: 39 },
      { label: 'Vie', sales: 4200, orders: 52 },
      { label: 'Sáb', sales: 5100, orders: 61 },
      { label: 'Dom', sales: 3842, orders: 47 },
    ],
    channelComparison: [
      { label: 'WhatsApp', sales: 2450, orders: 28 },
      { label: 'Carta digital', sales: 980, orders: 12 },
      { label: 'Teléfono', sales: 412, orders: 7 },
    ],
    restaurantRanking: [
      { id: 'r1', nameKey: 'locations.miraflores', sales: 2100, orders: 24, growth: 12 },
      { id: 'r2', nameKey: 'locations.central', sales: 980, orders: 14, growth: 5 },
      { id: 'r3', nameKey: 'locations.sanIsidro', sales: 762, orders: 9, growth: -2 },
    ],
    productRanking: [
      { id: 'p1', nameKey: 'menu.items.ceviche', sales: 840, orders: 20, categoryKey: 'menu.categories.starters' },
      { id: 'p2', nameKey: 'menu.items.arrozMariscos', sales: 620, orders: 15, categoryKey: 'menu.categories.mains' },
      { id: 'p3', nameKey: 'menu.items.comboFamiliar', sales: 510, orders: 8, categoryKey: 'menu.categories.mains' },
      { id: 'p4', nameKey: 'menu.items.chicha', sales: 180, orders: 12, categoryKey: 'menu.categories.drinks' },
    ],
    paymentMethods: [
      { id: 'yape', labelKey: 'reports.payYape', amount: 1420, pct: 37 },
      { id: 'card', labelKey: 'reports.payCard', amount: 1180, pct: 31 },
      { id: 'cash', labelKey: 'reports.payCash', amount: 890, pct: 23 },
      { id: 'plin', labelKey: 'reports.payPlin', amount: 352, pct: 9 },
    ],
    channelMetrics: {
      conversations: 128,
      conversionPct: 34,
      ordersNoHuman: 19,
      repurchasePct: 22,
    },
    reservations: {
      total: 18,
      confirmed: 14,
      guests: 52,
      cancellationPct: 8,
    },
    agentConnectivity: [
      { day: 'Lun', connectedHours: 14, disconnectedHours: 2 },
      { day: 'Mar', connectedHours: 16, disconnectedHours: 1 },
      { day: 'Mié', connectedHours: 15, disconnectedHours: 3 },
      { day: 'Jue', connectedHours: 17, disconnectedHours: 0 },
      { day: 'Vie', connectedHours: 16, disconnectedHours: 2 },
      { day: 'Sáb', connectedHours: 18, disconnectedHours: 1 },
      { day: 'Dom', connectedHours: 12, disconnectedHours: 4 },
    ],
  };

  if (period === 'today') return dailyReport;

  const normalizedDays = Math.max(1, rangeDays);
  const rangeScale = normalizedDays / 7;
  const weeklySales = rangeStart && rangeEnd
    ? salesBetween(brandId, rangeStart, rangeEnd)
    : Math.round(dailyReport.salesTrend.reduce((total, point) => total + point.sales, 0) * rangeScale);
  const previousMonthSales = rangeStart && rangeEnd
    ? salesBetween(brandId, rangeStart, rangeEnd, true)
    : Math.round(weeklySales / 1.12);
  const salesDelta = Math.round(((weeklySales - previousMonthSales) / Math.max(previousMonthSales, 1)) * 100);
  const weeklyOrders = Math.round(dailyReport.salesTrend.reduce((total, point) => total + point.orders, 0) * rangeScale);
  const scaleRank = (item: RankItem): RankItem => ({
    ...item,
    sales: Math.round(item.sales * normalizedDays * 0.95),
    orders: Math.round(item.orders * normalizedDays * 0.94),
  });

  return {
    ...dailyReport,
    kpis: dailyReport.kpis.map((kpi) => {
      if (kpi.id === 'sales') return {
        ...kpi,
        labelKey: 'reports.salesRange',
        value: weeklySales,
        deltaKey: 'reports.deltaUpRange',
        deltaValue: Math.abs(salesDelta),
        deltaDown: salesDelta < 0,
      };
      if (kpi.id === 'orders') return { ...kpi, value: weeklyOrders, deltaKey: 'reports.deltaOrdersRange' };
      if (kpi.id === 'ticket') return { ...kpi, value: 82.7, deltaKey: 'reports.deltaTicketRange' };
      return { ...kpi, value: Math.max(1, Math.round(11 * rangeScale)), deltaKey: 'reports.deltaCancelledRange' };
    }),
    hourlySales: dailyReport.salesTrend.map((point) => point.sales),
    channelComparison: dailyReport.channelComparison.map((point) => ({
      ...point,
      sales: Math.round(point.sales * normalizedDays * 0.957),
      orders: Math.round(point.orders * normalizedDays * 0.943),
    })),
    restaurantRanking: dailyReport.restaurantRanking.map(scaleRank),
    productRanking: dailyReport.productRanking.map(scaleRank),
    paymentMethods: dailyReport.paymentMethods.map((method) => ({
      ...method,
      amount: Math.round(method.amount * normalizedDays * 0.957),
    })),
    channelMetrics: {
      conversations: Math.round(862 * rangeScale),
      conversionPct: 36,
      ordersNoHuman: Math.round(131 * rangeScale),
      repurchasePct: 24,
      deltas: {
        conversations: 9,
        conversion: 4,
        ordersNoHuman: 11,
        repurchase: 6,
      },
    },
    reservations: {
      total: Math.round(126 * rangeScale),
      confirmed: Math.round(101 * rangeScale),
      guests: Math.round(364 * rangeScale),
      cancellationPct: 7,
    },
  };
}

const chatSeed: ChatConversation[] = [
  { id: 'ch1', phone: '+51 987 654 321', nameKey: 'customers.lucia', lastMessageKey: 'chats.lastOrder', time: '10:42', unread: 2, botActive: true, brandId: 'pacifico' },
  { id: 'ch2', phone: '+51 912 345 678', nameKey: 'customers.carlos', lastMessageKey: 'chats.lastThanks', time: '09:15', unread: 0, botActive: true, brandId: 'pacifico' },
  { id: 'ch3', phone: '+51 955 111 222', nameKey: 'customers.pedro', lastMessageKey: 'chats.lastDelivery', time: 'Ayer', unread: 1, botActive: false, brandId: 'pacifico' },
  { id: 'ch4', phone: '+51 988 777 666', nameKey: 'customers.ana', lastMessageKey: 'chats.lastMenu', time: 'Ayer', unread: 0, botActive: true, brandId: 'anticuchos' },
];


const chatMessagesSeed: ChatMessage[] = [
  { id: 'm1', chatId: 'ch1', role: 'customer', textKey: 'chats.msgLucia1', time: '10:38' },
  { id: 'm2', chatId: 'ch1', role: 'bot', textKey: 'chats.msgLucia2', time: '10:39' },
  { id: 'm3', chatId: 'ch1', role: 'customer', textKey: 'chats.msgLucia3', time: '10:40' },
  { id: 'm4', chatId: 'ch1', role: 'agent', textKey: 'chats.msgLucia4', time: '10:42' },
  { id: 'm5', chatId: 'ch2', role: 'customer', textKey: 'chats.msgCarlos1', time: '09:10' },
  { id: 'm6', chatId: 'ch2', role: 'bot', textKey: 'chats.msgCarlos2', time: '09:12' },
  { id: 'm7', chatId: 'ch2', role: 'customer', textKey: 'chats.msgCarlos3', time: '09:15' },
  { id: 'm8', chatId: 'ch3', role: 'customer', textKey: 'chats.msgPedro1', time: 'Ayer 18:20' },
  { id: 'm9', chatId: 'ch3', role: 'bot', textKey: 'chats.msgPedro2', time: 'Ayer 18:21' },
  { id: 'm10', chatId: 'ch3', role: 'customer', textKey: 'chats.msgPedro3', time: 'Ayer 18:22' },
  { id: 'm11', chatId: 'ch4', role: 'customer', textKey: 'chats.msgAna1', time: 'Ayer 12:05' },
  { id: 'm12', chatId: 'ch4', role: 'bot', textKey: 'chats.msgAna2', time: 'Ayer 12:06' },
];

let chatMessagesStore = structuredClone(chatMessagesSeed);

const kpis: DashboardKpi[] = [
  { id: 'sales', labelKey: 'reports.salesToday', value: 3842, deltaKey: 'reports.deltaUp', deltaDown: false },
  { id: 'orders', labelKey: 'reports.orders', value: 47, deltaKey: 'reports.deltaOrders', deltaDown: false },
  { id: 'ticket', labelKey: 'reports.avgTicket', value: 81.7, deltaKey: 'reports.deltaTicket', deltaDown: false },
  { id: 'cancelled', labelKey: 'reports.cancelled', value: 2, deltaKey: 'reports.deltaCancelled', deltaDown: true },
];

const notifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'order',
    titleKey: 'notifications.newOrder',
    bodyKey: 'notifications.newOrderBody',
    unread: true,
    time: '10:42',
    params: { id: 'A-2847', customer: 'Lucía Mendoza', total: 'S/ 55.00' },
  },
  {
    id: 'n2',
    kind: 'kitchen',
    titleKey: 'notifications.kitchenLate',
    bodyKey: 'notifications.kitchenLateBody',
    unread: true,
    time: '10:18',
    params: { id: 'A-2839', minutes: 22 },
  },
  {
    id: 'n3',
    kind: 'whatsapp',
    titleKey: 'notifications.whatsappLead',
    bodyKey: 'notifications.whatsappLeadBody',
    unread: true,
    time: '09:55',
    params: { name: 'Carlos' },
  },
  {
    id: 'n4',
    kind: 'payment',
    titleKey: 'notifications.paymentReceived',
    bodyKey: 'notifications.paymentReceivedBody',
    unread: false,
    time: 'Ayer',
    params: { amount: 'S/ 128.50', method: 'Yape' },
  },
  {
    id: 'n5',
    kind: 'system',
    titleKey: 'notifications.systemUpdate',
    bodyKey: 'notifications.systemUpdateBody',
    unread: false,
    time: 'Ayer',
  },
];

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Order[];
      const seedById = new Map(initialOrders.map((order) => [order.id, order]));
      const enriched = stored.map((order) => {
        const seed = seedById.get(order.id);
        return seed ? { ...order, customerName: seed.customerName, leadTag: seed.leadTag, phone: seed.phone, paymentMethod: seed.paymentMethod, createdAt: seed.createdAt } : order;
      });
      const storedIds = new Set(enriched.map((order) => order.id));
      const missing = initialOrders.filter((order) => !storedIds.has(order.id));
      const migrated = [...enriched, ...structuredClone(missing)];
      saveOrders(migrated);
      return migrated;
    }
  } catch { /* ignore */ }
  return structuredClone(initialOrders);
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function loadProducts(): CatalogProduct[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) return JSON.parse(raw) as CatalogProduct[];
  } catch { /* ignore */ }
  return structuredClone(initialProducts);
}

function saveProducts(products: CatalogProduct[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}


const defaultBrandConfigs: BrandConfig[] = [
  {
    brandId: 'pacifico',
    logoUrl: LOGO_COLOR_LOCAL,
    primaryColor: '#8746FF',
    secondaryColor: '#141A32',
    instagram: 'cevicheriapacifico',
    facebook: 'facebook.com/cevicheriapacifico',
    whatsapp: '+51 987 654 321',
    agentEnabled: false,
  },
  {
    brandId: 'anticuchos',
    logoUrl: LOGO_COLOR_LOCAL,
    primaryColor: '#DB1D5F',
    secondaryColor: '#141A32',
    instagram: 'anticuchosbar',
    facebook: 'facebook.com/anticuchosbar',
    whatsapp: '+51 912 345 678',
  },
];

function loadBrandConfigs(): BrandConfig[] {
  try {
    const raw = localStorage.getItem(BRAND_CONFIG_KEY);
    if (raw) return JSON.parse(raw) as BrandConfig[];
  } catch { /* ignore */ }
  return structuredClone(defaultBrandConfigs);
}

function saveBrandConfigs(configs: BrandConfig[]) {
  localStorage.setItem(BRAND_CONFIG_KEY, JSON.stringify(configs));
}

function delay(ms = 280) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const apiMock = {
  async login(email: string, password: string): Promise<UserSession | null> {
    await delay();
    if (!password.trim()) return null;
    if (email.includes('soporte')) {
      return { email, nameKey: 'users.laura', initials: 'SA', role: 'superadmin' };
    }
    return { email, nameKey: 'users.maria', initials: 'MG', role: 'owner' };
  },

  async getBrands() {
    await delay(180);
    const configs = loadBrandConfigs();
    return structuredClone(loadBrands()).map((brand) => {
      const config = configs.find((item) => item.brandId === brand.id);
      return {
        ...brand,
        logoUrl: brand.logoUrl || config?.logoUrl || '',
      };
    });
  },

  async getOrders(brandId: string, filters?: OrdersListFilters) {
    await delay();
    let list = loadOrders().filter((o) => o.brandId === brandId);
    if (filters?.dateMode !== 'last12Hours' && filters?.dateFrom) {
      const from = filters.dateFrom;
      const to = filters.dateTo ?? from;
      list = list.filter((o) => {
        const date = o.createdAt ?? from;
        return date >= from && date <= to;
      });
    }
    const search = filters?.search?.trim().toLowerCase();
    if (search) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(search) ||
          o.customerName?.toLowerCase().includes(search) ||
          o.customerKey.toLowerCase().includes(search),
      );
    }
    return list;
  },

  /** Contactos demo para embudo (PRP 012). */
  async getContacts(subDomain: string, search?: string) {
    await delay(160);
    const now = new Date().toISOString();
    const seed = [
      {
        _id: 'mock-c-1',
        subDomain,
        clientPhone: '+51999888777',
        clientName: 'Lucía Demo',
        currentAgent: 'artemis',
        isActive: true,
        lastActivity: now,
        clientType: 'client',
        conversationState: 'starting',
        sessionData: { conversationState: 'starting' },
        lastMessageContent: 'Hola, quiero ver el menú',
        unreadMessages: 1,
      },
      {
        _id: 'mock-c-2',
        subDomain,
        clientPhone: '+51912345678',
        clientName: 'Carlos Demo',
        currentAgent: 'artemis',
        isActive: true,
        lastActivity: now,
        clientType: 'client',
        conversationState: 'searching',
        sessionData: { conversationState: 'searching' },
        lastMessageContent: '¿Tienen ceviche?',
        unreadMessages: 0,
      },
      {
        _id: 'mock-c-3',
        subDomain,
        clientPhone: '+51955111222',
        clientName: 'Pedro Demo',
        currentAgent: 'human',
        isActive: false,
        lastActivity: now,
        clientType: 'client',
        conversationState: 'starting',
        sessionData: { conversationState: 'starting' },
        lastMessageContent: 'Necesito hablar con alguien',
        unreadMessages: 2,
      },
      {
        _id: 'mock-c-4',
        subDomain,
        clientPhone: '+51988777666',
        clientName: 'Ana Demo',
        currentAgent: 'artemis',
        isActive: true,
        lastActivity: now,
        clientType: 'client',
        conversationState: 'order_placed',
        sessionData: { conversationState: 'order_placed' },
        lastMessageContent: 'Pedido confirmado',
        lastOrderNumber: '1001',
        unreadMessages: 0,
      },
    ];
    const q = search?.trim().toLowerCase();
    const data = q
      ? seed.filter(
          (c) =>
            c.clientName.toLowerCase().includes(q) ||
            c.clientPhone.includes(q) ||
            (c.lastMessageContent?.toLowerCase().includes(q) ?? false),
        )
      : seed;
    return {
      data,
      meta: {
        totalAgentStates: data.length,
        activeAgentStates: data.filter((c) => c.isActive).length,
        inactiveAgentStates: data.filter((c) => !c.isActive).length,
        conversationStateCounts: {},
        pagination: {
          currentPage: 1,
          limit: 150,
          totalPages: 1,
          totalItems: data.length,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
    };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    await delay(120);
    const orders = loadOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return null;
    orders[idx] = {
      ...orders[idx],
      status,
      minutesInKitchen: status === 'in_kitchen' ? 0 : orders[idx].minutesInKitchen,
    };
    saveOrders(orders);
    return orders[idx];
  },

  async getDashboard(brandId: string, period: 'today' | 'range' = 'today', rangeDays = 7, rangeStart?: string, rangeEnd?: string) {
    await delay(200);
    return buildDashboard(brandId, period, rangeDays, rangeStart, rangeEnd);
  },


  async getChats(brandId: string) {
    await delay(220);
    return structuredClone(chatSeed.filter((c) => c.brandId === brandId));
  },

  async setConversationBotState(chatId: string, isActive: boolean) {
    await delay(120);
    const chat = chatSeed.find((item) => item.id === chatId);
    if (!chat) throw new Error('Conversación no encontrada');
    chat.botActive = isActive;
  },

  async getChatMessages(chatId: string) {
    await delay(180);
    return structuredClone(chatMessagesStore.filter((m) => m.chatId === chatId));
  },

  async sendChatMessage(chatId: string, text: string) {
    await delay(120);
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      chatId,
      role: 'agent',
      text: text.trim(),
      time: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
    };
    chatMessagesStore = [...chatMessagesStore, message];
    return message;
  },

  async getNotifications() {
    await delay(150);
    return structuredClone(notifications);
  },

  async getProducts(brandId: string) {
    await delay(200);
    return loadProducts().filter((p) => p.brandId === brandId);
  },

  async toggleProductActive(productId: string) {
    await delay(100);
    const products = loadProducts();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx < 0) return null;
    products[idx] = { ...products[idx], active: !products[idx].active };
    saveProducts(products);
    return products[idx];
  },

  async getClients(brandId: string) {
    await delay(200);
    return structuredClone(clients.filter((c) => c.brandId === brandId));
  },

  async getLocations(brandId: string) {
    await delay(200);
    return structuredClone(loadLocations().filter((l) => l.brandId === brandId));
  },

  async getBrandConfig(brandId: string) {
    await delay(180);
    const configs = loadBrandConfigs();
    const found = configs.find((c) => c.brandId === brandId);
    if (found) return structuredClone(found);
    return structuredClone(defaultBrandConfigs[0]);
  },

  async saveBrandConfig(config: BrandConfig) {
    await delay(220);
    const configs = loadBrandConfigs();
    const idx = configs.findIndex((c) => c.brandId === config.brandId);
    if (idx >= 0) configs[idx] = config;
    else configs.push(config);
    saveBrandConfigs(configs);
    return config;
  },


  async createBrand(input: { name: string; subdomain: string }) {
    await delay(260);
    const id = input.subdomain.trim().toLowerCase();
    if (!id || !input.name.trim()) return null;

    const all = loadBrands();
    if (all.some((b) => b.id === id)) return null;

    const brand = {
      id,
      initials: brandInitials(input.name),
      nameKey: 'brands.custom',
      displayName: input.name.trim(),
      logoUrl: '',
      locations: 1,
      ordersToday: 0,
    };
    saveBrands([...all, brand]);

    const locs = loadLocations();
    locs.push({
      id: `l-${id}-1`,
      brandId: id,
      nameKey: 'locations.central',
      addressKey: 'locations.addressCentral',
      phone: '+51 900 000 000',
      active: true,
    });
    saveLocations(locs);

    const configs = loadBrandConfigs();
    configs.push({
      brandId: id,
      logoUrl: '',
      primaryColor: '#8746FF',
      secondaryColor: '#141A32',
      instagram: id,
      facebook: `facebook.com/${id}`,
      whatsapp: '+51 900 000 000',
    });
    saveBrandConfigs(configs);

    return structuredClone(brand);
  },

  resetDemo() {
    saveOrders(structuredClone(initialOrders));
    saveProducts(structuredClone(initialProducts));
    saveBrandConfigs(structuredClone(defaultBrandConfigs));
    saveBrands(structuredClone(seedBrands));
    saveLocations(structuredClone(seedLocations));
  },
};
