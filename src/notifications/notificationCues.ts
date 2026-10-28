/** Sonidos del panel (`public/sounds`) y cuándo les toca sonar. */

export type CueSound = 'orden' | 'preorden' | 'chat' | 'humano' | 'sos' | 'reserva';

export type CueDecision = 'silent' | 'sound' | 'notification';

const PRE_ORDER_STATUSES = new Set(['Pre Orden', 'Programado']);

const READY_FOR_PICKUP = ['para_recoger', 'para recoger', 'pickup', 'ready_for_pickup'];

/** Mismos defaults que el panel. El mapa personal de la marca no se reimplementa aquí. */
const DEFAULT_CHAT_SOUND: Record<string, boolean> = {
  Iniciando: true,
  Pidiendo: false,
  Órdenes: false,
  Humano: true,
};

export function decideCue(input: { inApp: boolean; alertsButtonOnScreen: boolean }): CueDecision {
  if (!input.inApp) return 'notification';
  if (input.alertsButtonOnScreen) return 'sound';
  return 'silent';
}

/** `deviceMemory` redondea hacia abajo. 2 GB o menos es gama baja; sin dato, no. */
export function isLowEndDevice(deviceMemoryGb: number | undefined): boolean {
  return typeof deviceMemoryGb === 'number' && deviceMemoryGb > 0 && deviceMemoryGb <= 2;
}

export function orderSoundForStatus(status: string | undefined): CueSound {
  return status && PRE_ORDER_STATUSES.has(status) ? 'preorden' : 'orden';
}

export function isReadyForPickup(status: string | undefined): boolean {
  const normalized = (status ?? '').toLowerCase().trim();
  return READY_FOR_PICKUP.some((item) =>
    normalized === item ||
    (normalized.includes('para') && normalized.includes('recoger')) ||
    normalized.includes('pickup') ||
    normalized.includes('ready'),
  );
}

export function orderCueSound(input: {
  role?: string;
  type?: string;
  playSound?: boolean;
  status?: string;
}): CueSound | null {
  if (input.type !== 'order_created' && input.type !== 'order_status_changed') return null;
  if (input.role === 'motorized') {
    return isReadyForPickup(input.status) ? orderSoundForStatus(input.status) : null;
  }
  if (input.playSound !== true) return null;
  return orderSoundForStatus(input.status);
}

export function complaintCue(event: { type?: string; data?: { category?: unknown } }): boolean {
  if (event.type !== 'notification' && event.type !== 'alert') return false;
  return String(event.data?.category ?? '').toLowerCase() === 'complaint';
}

export type ReservationCueKind = 'created' | 'updated' | 'cancelled';

/** Una reserva nueva, un cambio o una cancelación. El mismo id actualiza una sola tarjeta. */
export function reservationCueKind(type: string | undefined): ReservationCueKind | null {
  if (type === 'reservation_created') return 'created';
  if (type === 'reservation_updated') return 'updated';
  if (type === 'reservation_deleted') return 'cancelled';
  return null;
}

/** Id estable de la notificación. El mismo asunto reemplaza la tarjeta anterior. */
export function notificationCardId(cardKey: string): number {
  let hash = 2166136261;
  for (let index = 0; index < cardKey.length; index += 1) {
    hash ^= cardKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const id = (hash >>> 0) % 2_000_000_000;
  return id === 0 ? 1 : id;
}

function chatSoundAllowed(stateKey: string): boolean {
  return DEFAULT_CHAT_SOUND[stateKey] === true;
}

export function resolveChatSoundKey(message: {
  conversationState?: string | null;
  botStatus?: boolean;
  isActive?: boolean;
  sessionData?: Record<string, unknown> | null;
}): string {
  if (message.isActive === false || message.botStatus === false) {
    const state = (message.sessionData?.conversationState ?? message.conversationState) as string | undefined;
    if (state !== 'order_placed' && state !== 'order_scheduled') return 'Humano';
  }
  const state = (message.sessionData?.conversationState ?? message.conversationState) as string | undefined;
  if (state === 'order_placed' || state === 'order_scheduled') return 'Órdenes';
  if (state === 'searching') return 'Pidiendo';
  return 'Iniciando';
}

/** Iniciando: solo el primer mensaje del cliente, igual que el panel. */
export function chatCueForNewMessage(message: {
  isNewConversation?: boolean;
  sender?: string;
}): CueSound | null {
  if (message.sender && message.sender !== 'user') return null;
  if (!message.isNewConversation) return null;
  if (!chatSoundAllowed('Iniciando')) return null;
  return 'chat';
}

/** Pidiendo / Órdenes / Humano: al cambiar de estado, con el default del panel. */
export function chatCueForTransition(previousKey: string | undefined, nextKey: string): CueSound | null {
  if (previousKey === undefined || previousKey === nextKey) return null;
  if (nextKey === 'Iniciando' || !chatSoundAllowed(nextKey)) return null;
  return nextKey === 'Humano' ? 'humano' : 'chat';
}
