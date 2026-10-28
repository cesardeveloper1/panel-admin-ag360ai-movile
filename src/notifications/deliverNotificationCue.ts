import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { CueDecision, CueSound } from './notificationCues';
import { decideCue, isLowEndDevice, notificationCardId } from './notificationCues';

const ALERTS_BUTTON = '.ag-header-bell, .agilito-top-bell';
const RECENT_MS = 5000;

let nativeActive = true;
let watching = false;
let prepared = false;
const recent = new Set<string>();

const CHANNEL_NAME: Record<CueSound, string> = {
  orden: 'Pedidos',
  preorden: 'Preórdenes',
  chat: 'Chats',
  humano: 'Atención humana',
  sos: 'Reclamos',
  reserva: 'Reservas',
};

export function startNotificationCues(): void {
  if (watching || typeof document === 'undefined') return;
  watching = true;
  const unlock = () => {
    const audio = new Audio('/sounds/orden.aac');
    audio.muted = true;
    void audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }).catch(() => undefined);
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
  void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
    nativeActive = isActive;
  }).catch(() => undefined);
}

export function isAppInForeground(): boolean {
  return nativeActive && document.visibilityState !== 'hidden';
}

/** La campana está en el header (tablet o Agilito) o dentro del menú ⋯ abierto. */
export function alertsButtonOnScreen(): boolean {
  const button = document.querySelector(ALERTS_BUTTON);
  if (!(button instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(button);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return button.getClientRects().length > 0;
}

export function currentCueDecision(): CueDecision {
  return decideCue({ inApp: isAppInForeground(), alertsButtonOnScreen: alertsButtonOnScreen() });
}

export function acceptCue(id: string): boolean {
  if (recent.has(id)) return false;
  recent.add(id);
  window.setTimeout(() => recent.delete(id), RECENT_MS);
  return true;
}

function playInApp(sound: CueSound): void {
  const audio = new Audio(`/sounds/${sound}.aac`);
  audio.volume = sound === 'sos' ? 0.6 : 0.4;
  void audio.play().catch(() => {
    if (sound !== 'sos') return;
    const fallback = new Audio('/sounds/orden.aac');
    fallback.volume = 0.6;
    void fallback.play().catch(() => undefined);
  });
}

async function prepareNativeChannels(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  if (!prepared) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display !== 'granted') await LocalNotifications.requestPermissions();
    prepared = true;
  }
  const allowed = await LocalNotifications.checkPermissions();
  if (allowed.display !== 'granted') return false;
  await Promise.all((Object.keys(CHANNEL_NAME) as CueSound[]).map((sound) =>
    LocalNotifications.createChannel({
      id: `ag-cue-${sound}`,
      name: CHANNEL_NAME[sound],
      sound: `${sound}.aac`,
      importance: 4,
    }),
  ));
  return true;
}

async function postSystemNotification(cue: { sound: CueSound; title: string; body: string; cardKey: string }): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const ready = await prepareNativeChannels().catch(() => false);
    if (!ready) return;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowEnd = isLowEndDevice(memory);
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationCardId(cue.cardKey),
        title: cue.title,
        body: cue.body,
        sound: `${cue.sound}.aac`,
        channelId: `ag-cue-${cue.sound}`,
        isExactNotification: !lowEnd,
        ...(lowEnd ? {} : {
          schedule: { at: new Date(Date.now() + 1000), allowWhileIdle: true },
        }),
      }],
    });
    return;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  new Notification(cue.title, { body: cue.body, tag: cue.cardKey });
}

export async function deliverNotificationCue(cue: { sound: CueSound; title: string; body: string; cardKey: string }): Promise<void> {
  const decision = currentCueDecision();
  if (decision === 'silent') return;
  if (decision === 'sound') {
    playInApp(cue.sound);
    return;
  }
  await postSystemNotification(cue);
}
