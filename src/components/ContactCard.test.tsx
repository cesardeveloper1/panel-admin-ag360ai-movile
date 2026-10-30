import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ContactCard } from './ContactCard';
import type { ContactInfo } from '../types/contact';
import '../i18n';
afterEach(cleanup);
const contact: ContactInfo & { chatbotNumber: string } = { _id: 'chat', subDomain: 'qa', clientPhone: '+51911111111', chatbotNumber: '+51999999999', clientName: 'Cliente de prueba', currentAgent: 'test', isActive: true, lastActivity: '', clientType: 'Client', conversationState: 'starting', unreadMessages: 0, progress: { hasSession: true, name: true, cart: false, delivery: true, payment: false } };
it('shows only the location and client phone, with accessible collected-data states', () => {
  render(<ContactCard contact={contact} attentionLocation="Miraflores" />);
  expect(screen.getByText('Miraflores')).toBeInTheDocument();
  expect(screen.getByText(contact.clientPhone!)).toBeInTheDocument();
  expect(screen.queryByText(contact.chatbotNumber)).toBeNull();
  expect(screen.getByRole('img', { name: 'Nombre: Recibido' })).toHaveClass('contact-card__step--received');
  expect(screen.getByRole('img', { name: 'Carrito: Pendiente' })).toHaveClass('contact-card__step--pending');
  expect(screen.getByRole('img', { name: 'Modalidad: Recibido' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Método de pago: Pendiente' })).toBeInTheDocument();
});
it('shows reservation steps and leaves the order icons off that row', () => {
  render(<ContactCard contact={{ ...contact, progress: {
    hasSession: true, flow: 'reservation', name: true, cart: true, delivery: true, payment: false,
    reservation: { name: true, party: false, schedule: true, zone: false },
  } }} />);
  expect(screen.getByRole('img', { name: 'Nombre: Recibido' })).toHaveClass('contact-card__step--received');
  expect(screen.getByRole('img', { name: 'Personas: Pendiente' })).toHaveClass('contact-card__step--pending');
  expect(screen.getByRole('img', { name: 'Fecha y hora: Recibido' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Zona: Pendiente' })).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: /Carrito|Modalidad|Método de pago/ })).toBeNull();
  expect(document.querySelector('.contact-card__progress svg')).toBeNull();
});
it('keeps chat entry working once, without adding a local placeholder when none applies', () => {
  const onChat = vi.fn(); const onClick = vi.fn();
  render(<ContactCard contact={contact} onChat={onChat} onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir chat · WhatsApp' }));
  expect(onChat).toHaveBeenCalledTimes(1);
  expect(onClick).not.toHaveBeenCalled();
  expect(document.querySelector('.contact-card__location')).toBeNull();
});

it.each([['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['messenger', 'Messenger']] as const)('identifies the %s chat entry and preserves its action', (channel, label) => {
  const onChat = vi.fn();
  render(<ContactCard contact={{ ...contact, channel }} onChat={onChat} />);
  fireEvent.click(screen.getByRole('button', { name: `Abrir chat · ${label}` }));
  expect(onChat).toHaveBeenCalledTimes(1);
});
