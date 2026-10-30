import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ChatComposer } from './ChatComposer';
import { apiFacade } from '../services/apiFacade';
import type { ChatConversation } from '../types';
import '../i18n';

vi.mock('../services/apiFacade', () => ({ apiFacade: { sendChatMessage: vi.fn(), listQuickMessages: vi.fn() } }));
vi.mock('../hooks/useViewport', () => ({ useViewport: () => ({ isTablet: false }) }));
const chat: ChatConversation = { id: 'demo', phone: '000', nameKey: '', lastMessageKey: '', time: '', unread: 0, botActive: false, brandId: 'demo' };
const props = { chat, brandId: 'demo', subDomain: 'demo', onSent: vi.fn(), onError: vi.fn() };
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('keeps the draft after a failed send and allows retrying', async () => {
  vi.mocked(apiFacade.sendChatMessage).mockRejectedValueOnce(new Error('offline'));
  render(<ChatComposer {...props} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje' }), { target: { value: 'Pedido de prueba' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  await waitFor(() => expect(props.onError).toHaveBeenCalledWith('chats.sendError'));
  expect(screen.getByRole('textbox', { name: 'Mensaje' })).toHaveValue('Pedido de prueba');
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
});

it('blocks another submission while sending and clears only after success', async () => {
  let finish!: (value: null) => void;
  vi.mocked(apiFacade.sendChatMessage).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<ChatComposer {...props} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Prueba' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(apiFacade.sendChatMessage).toHaveBeenCalledOnce();
  await act(async () => { finish(null); });
  expect(screen.getByRole('textbox')).toHaveValue('');
});

it('exposes the emoji panel state and resets the draft when changing chats', () => {
  const view = render(<ChatComposer {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Emojis' }));
  expect(screen.getByRole('button', { name: 'Emojis' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('button', { name: '😀' }));
  expect(screen.getByRole('textbox')).toHaveValue('😀');
  view.rerender(<ChatComposer {...props} chat={{ ...chat, id: 'other' }} />);
  expect(screen.getByRole('textbox')).toHaveValue('');
});
