export type UserRole = 'owner' | 'superadmin';

export type OrderStatus =
  | 'pre_order'
  | 'accepted'
  | 'in_kitchen'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export type KanbanGroup = 'new' | 'processing' | 'delivered';

export type KanbanSubState =
  | 'pre_order'
  | 'accepted'
  | 'in_kitchen'
  | 'ready'
  | 'on_the_way'
  | 'delivered';

export interface Brand {
  id: string;
  initials: string;
  nameKey: string;
  displayName?: string;
  /** Subdominio ssgg (filtro GET /orders?subdomains=). */
  subdomain?: string;
  logoUrl?: string;
  locations: number;
  ordersToday: number;
}

export interface OrderItem {
  qty: number;
  nameKey: string;
  /** Texto literal del producto (API); si existe, la UI lo prioriza sobre nameKey i18n. */
  name?: string;
  price: number;
}

export interface Order {
  id: string;
  /** orderNumber del backend (orquestación / detalle). */
  orderNumber?: string;
  customerKey: string;
  customerName?: string;
  leadTag?: 'new' | 'recurring' | 'vip';
  status: OrderStatus;
  channel: 'whatsapp' | 'web' | 'phone';
  deliveryType: 'delivery' | 'pickup';
  items: OrderItem[];
  total: number;
  minutesInKitchen?: number;
  needsHuman?: boolean;
  brandId: string;
  locationKey: string;
  phone?: string;
  paymentMethod?: 'yape' | 'card' | 'cash' | 'plin';
  createdAt?: string;
}

export interface DashboardKpi {
  id: string;
  labelKey: string;
  value: number;
  deltaKey: string;
  deltaValue?: number;
  deltaDown?: boolean;
}

export interface UserSession {
  email: string;
  nameKey: string;
  /** Nombre real del usuario (API); si existe, la UI lo prioriza sobre nameKey i18n. */
  displayName?: string;
  initials: string;
  role: UserRole;
  brandId?: string;
}

export type NotificationKind = 'order' | 'kitchen' | 'payment' | 'whatsapp' | 'system';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  titleKey?: string;
  bodyKey?: string;
  title?: string;
  body?: string;
  unread: boolean;
  time?: string;
  params?: Record<string, string | number>;
}

export type ProductCategory = 'starters' | 'mains' | 'drinks' | 'desserts';

export interface CatalogCategory {
  id: string;
  name: string;
  order?: number;
}

export interface CatalogProduct {
  id: string;
  brandId: string;
  /** Clave de traducción disponible solo en el catálogo de demostración. */
  nameKey?: string;
  /** Nombre real enviado por el gestor de menú. */
  name?: string;
  /** Categoría legacy del catálogo de demostración. */
  category: string;
  categoryId?: string;
  categoryName?: string;
  price: number;
  active: boolean;
  soldOut?: boolean;
  emoji?: string;
  imageUrl?: string;
}

export interface CatalogMenu {
  categories: CatalogCategory[];
  products: CatalogProduct[];
}

export interface CreateCatalogProductInput {
  brandId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  price: number;
  active: boolean;
}

export type ClientSegment = 'vip' | 'frequent' | 'inactive' | 'regular';

export interface CrmClient {
  id: string;
  brandId: string;
  nameKey: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  segment: ClientSegment;
  initials: string;
}

export interface BranchLocation {
  id: string;
  brandId: string;
  name?: string;
  address?: string;
  nameKey?: string;
  addressKey?: string;
  phone: string;
  active: boolean;
}

export interface BrandConfig {
  brandId: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  agentEnabled?: boolean;
}


export interface ChartPoint {
  label: string;
  sales: number;
  orders: number;
}

export interface RankItem {
  id: string;
  nameKey: string;
  sales: number;
  orders: number;
  growth?: number;
  categoryKey?: string;
}

export interface PaymentMethodStat {
  id: string;
  labelKey: string;
  amount: number;
  pct: number;
}

export interface ChannelMetrics {
  conversations: number;
  conversionPct: number;
  ordersNoHuman: number;
  repurchasePct: number;
  deltas?: {
    conversations: number;
    conversion: number;
    ordersNoHuman: number;
    repurchase: number;
  };
}

export interface ReservationMetrics {
  total: number;
  confirmed: number;
  guests: number;
  cancellationPct: number;
}

export interface AgentConnectivityDay {
  day: string;
  connectedHours: number;
  disconnectedHours: number;
}

export interface DashboardReport {
  /** Símbolo de moneda (API); default UI `S/`. */
  currencySymbol?: string;
  kpis: DashboardKpi[];
  hourlySales: number[];
  salesTrend: ChartPoint[];
  channelComparison: ChartPoint[];
  restaurantRanking: RankItem[];
  productRanking: RankItem[];
  paymentMethods: PaymentMethodStat[];
  channelMetrics: ChannelMetrics;
  reservations: ReservationMetrics;
  agentConnectivity: AgentConnectivityDay[];
}

export interface ChatConversation {
  id: string;
  phone: string;
  nameKey: string;
  /** Nombre visible (API); prioriza sobre nameKey i18n. */
  displayName?: string;
  agentStateId?: string;
  clientBsuid?: string;
  subDomain?: string;
  lastMessageKey: string;
  /** Preview literal del último mensaje (API). */
  lastMessage?: string;
  time: string;
  unread: number;
  botActive: boolean;
  brandId: string;
}

export type ChatMessageRole = 'customer' | 'agent' | 'bot';

export interface ChatMessage {
  id: string;
  chatId: string;
  role: ChatMessageRole;
  textKey?: string;
  text?: string;
  time: string;
  createdAt?: string;
  status?: string;
  mediaUrl?: string;
  mediaType?: string;
  /** Sender crudo del backend (user | ai | device). */
  senderRaw?: 'user' | 'ai' | 'device';
}
