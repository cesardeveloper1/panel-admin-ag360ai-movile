import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PartnerGroupCard } from './PartnerGroupsPage';
import '../../i18n';
afterEach(cleanup);
it('shows all locations for a catch-all group rather than zero locations', () => {
  const open = vi.fn();
  render(<PartnerGroupCard group={{wspGroupId:'demo@g.us',label:'Equipo Demo',branchIds:[],isActive:true}} onOpen={open} />);
  expect(screen.getByText('Todos los locales')).toBeInTheDocument();
  expect(screen.getByText('Activo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button'));
  expect(open).toHaveBeenCalledOnce();
});
it('keeps an inactive group status readable', () => {
  render(<PartnerGroupCard group={{wspGroupId:'demo@g.us',label:'Equipo pausado',branchIds:['branch'],isActive:false}} onOpen={vi.fn()} />);
  expect(screen.getByText('Inactivo')).toBeInTheDocument();
  expect(screen.queryByText('Todos los locales')).not.toBeInTheDocument();
});
