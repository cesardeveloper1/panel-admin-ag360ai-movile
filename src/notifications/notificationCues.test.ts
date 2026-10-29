import { expect, it } from 'vitest';
import {
  chatCueForNewMessage,
  chatCueForTransition,
  complaintCue,
  decideCue,
  isLowEndDevice,
  notificationCardId,
  orderCueSound,
  reservationCueKind,
  resolveChatSoundKey,
} from './notificationCues';

it('treats only a reported 2 GB or less as low-end', () => {
  expect(isLowEndDevice(2)).toBe(true);
  expect(isLowEndDevice(0.5)).toBe(true);
  expect(isLowEndDevice(4)).toBe(false);
  expect(isLowEndDevice(undefined)).toBe(false);
});

it('stays quiet inside the app unless the alerts button is on screen', () => {
  expect(decideCue({ inApp: true, alertsButtonOnScreen: false })).toBe('silent');
  expect(decideCue({ inApp: true, alertsButtonOnScreen: true })).toBe('sound');
  expect(decideCue({ inApp: false, alertsButtonOnScreen: false })).toBe('notification');
});

it('uses the panel order sounds and the socket playSound flag', () => {
  expect(orderCueSound({ type: 'order_created', playSound: true, status: 'Aceptado' })).toBe('orden');
  expect(orderCueSound({ type: 'order_created', playSound: true, status: 'Pre Orden' })).toBe('preorden');
  expect(orderCueSound({ type: 'order_created', playSound: false, status: 'Aceptado' })).toBeNull();
  expect(orderCueSound({ type: 'order_updated', playSound: true })).toBeNull();
  expect(orderCueSound({ role: 'motorized', type: 'order_status_changed', status: 'para_recoger' })).toBe('orden');
  expect(orderCueSound({ role: 'motorized', type: 'order_created', status: 'Aceptado' })).toBeNull();
  expect(orderCueSound({ role: 'rider', type: 'order_assigned', status: 'En cocina' })).toBe('orden');
  expect(orderCueSound({ role: 'rider', type: 'order_status_changed', status: 'para_recoger' })).toBeNull();
  expect(orderCueSound({ role: 'rider', type: 'order_updated' })).toBeNull();
});

it('plays chat and complaint sounds with the panel defaults', () => {
  expect(chatCueForNewMessage({ sender: 'user', isNewConversation: true })).toBe('chat');
  expect(chatCueForNewMessage({ sender: 'ai', isNewConversation: true })).toBeNull();
  expect(chatCueForNewMessage({ sender: 'user', isNewConversation: false })).toBeNull();
  expect(chatCueForTransition(undefined, 'Humano')).toBeNull();
  expect(chatCueForTransition('Iniciando', 'Humano')).toBe('humano');
  expect(chatCueForTransition('Iniciando', 'Pidiendo')).toBeNull();
  expect(resolveChatSoundKey({ isActive: false, sessionData: {} })).toBe('Humano');
  expect(complaintCue({ type: 'notification', data: { category: 'complaint' } })).toBe(true);
  expect(complaintCue({ type: 'notification', data: { category: 'orders' } })).toBe(false);
});

it('treats a reservation as one card that changes state', () => {
  expect(reservationCueKind('reservation_created')).toBe('created');
  expect(reservationCueKind('reservation_updated')).toBe('updated');
  expect(reservationCueKind('reservation_deleted')).toBe('cancelled');
  expect(reservationCueKind('order_created')).toBeNull();
  expect(notificationCardId('reservation:abc')).toBe(notificationCardId('reservation:abc'));
  expect(notificationCardId('reservation:abc')).not.toBe(notificationCardId('order:abc'));
});
