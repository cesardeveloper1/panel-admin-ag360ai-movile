import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import QuickMessagesPage from './QuickMessagesPage';
import { apiFacade } from '../services/apiFacade';
import '../i18n';
vi.mock('../hooks/useApp', () => ({ useApp: () => ({brand:{id:'demo'},authEpoch:1}) }));
vi.mock('../services/apiFacade', () => ({ apiFacade: {listQuickMessages:vi.fn()} }));
vi.mock('../components/layouts', () => ({ StackLayout: ({children,search}: {children:ReactNode;search:{value:string;onChange:(value:string)=>void;placeholder:string}}) => <div><input aria-label={search.placeholder} value={search.value} onChange={event=>search.onChange(event.target.value)} />{children}</div> }));
const rows=[{_id:'one',brandId:'demo',shortcut:'hola',text:'Bienvenido al negocio',isActive:true},{_id:'two',brandId:'demo',shortcut:'horarios',text:'Abrimos de lunes a sábado',isActive:true}];
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('filters loaded replies by shortcut and body without another request', async()=>{
  vi.mocked(apiFacade.listQuickMessages).mockResolvedValue(rows);
  render(<QuickMessagesPage />);
  await screen.findByText('/hola');
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'sábado'}});
  expect(screen.queryByText('/hola')).not.toBeInTheDocument();
  expect(screen.getByText('/horarios')).toBeInTheDocument();
  expect(apiFacade.listQuickMessages).toHaveBeenCalledTimes(1);
});
it('distinguishes no search matches from failed loading', async()=>{
  vi.mocked(apiFacade.listQuickMessages).mockResolvedValue(rows);
  render(<QuickMessagesPage />); await screen.findByText('/hola');
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'no-coincide'}});
  expect(screen.getByRole('status')).toHaveTextContent('No hay mensajes que coincidan');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('recovers from a failed load with retry',async()=>{
  vi.mocked(apiFacade.listQuickMessages).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(rows);
  render(<QuickMessagesPage />); await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button',{name:'Reintentar'}));
  expect(await screen.findByText('/hola')).toBeInTheDocument();
});
