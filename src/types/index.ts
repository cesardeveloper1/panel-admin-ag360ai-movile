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
  | 'starting'
  | 'ordering'
  | 'human'
  | 'in_kitchen'
  | 'ready'
  | 'on_the_way'
  | 'delivered';

export interface Brand {
  id: string;
  initials: string;
  nameKey: string;
  displayName?: string;
  locations: number;
  ordersToday: number;
}

export interface OrderItem {
  qty: number;
  nameKey: string;
  price: number;
}

export interface Order {
  id: string;
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
  initials: string;
  role: UserRole;
  brandId?: string;
}

export type NotificationKind = 'order' | 'kitchen' | 'payment' | 'whatsapp' | 'system';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  titleKey: string;
  bodyKey: string;
  unread: boolean;
  time?: string;
  params?: Record<string, string | number>;
}

export type ProductCategory = 'starters' | 'mains' | 'drinks' | 'desserts';

export interface CatalogProduct {
  id: string;
  brandId: string;
  nameKey: string;
  category: ProductCategory;
  price: number;
  active: boolean;
  soldOut?: boolean;
  emoji: string;
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
  nameKey: string;
  addressKey: string;
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
  lastMessageKey: string;
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
}
