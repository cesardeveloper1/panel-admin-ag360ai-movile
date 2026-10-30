import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import NewLocationSheet from './NewLocationSheet';
import '../i18n';
vi.mock('@ionic/react', () => {
 const Box = ({children}: {children?: ReactNode}) => <div>{children}</div>;
 return {IonModal: ({children,isOpen}: {children?:ReactNode;isOpen:boolean}) => isOpen ? <div>{children}</div> : null,
 IonHeader:Box,IonTitle:Box,IonToolbar:Box,IonSpinner:Box,
 IonInput: ({value,onIonInput,disabled,'aria-label':label}: {value:string;onIonInput:(e:{detail:{value:string}})=>void;disabled:boolean;'aria-label':string}) => <input aria-label={label} value={value} disabled={disabled} onChange={e=>onIonInput({detail:{value:e.target.value}})} />,
 IonToggle: ({checked,onIonChange,disabled,'aria-label':label}: {checked:boolean;onIonChange:(e:{detail:{checked:boolean}})=>void;disabled:boolean;'aria-label':string}) => <input type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={e=>onIonChange({detail:{checked:e.target.checked}})} />};
});

afterEach(cleanup);
const location = {id:'demo',brandId:'demo',name:'Local Demo',address:'Calle de ejemplo 123',phone:'+51 900 000 000',active:false};
const props = {open:true,onDismiss:vi.fn(),onSubmit:vi.fn()};
it('requires all existing mandatory fields and preserves a phone as text', () => {
 const submit=vi.fn();render(<NewLocationSheet {...props} onSubmit={submit}/>);
 expect(screen.getByRole('button',{name:'Crear local'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Nombre del local'),{target:{value:' Local de prueba '}});
 fireEvent.change(screen.getByLabelText('Dirección'),{target:{value:' Calle 123 '}});
 fireEvent.change(screen.getByLabelText('Teléfono'),{target:{value:'+51 090 000 000'}});
 fireEvent.click(screen.getByRole('button',{name:'Crear local'}));
 expect(submit).toHaveBeenCalledWith({name:'Local de prueba',address:'Calle 123',phone:'+51 090 000 000',active:true});
});
it('loads edit values, preserves a draft on refresh and loads another selected location', () => {
 const view=render(<NewLocationSheet {...props} location={location}/>);
 expect(screen.getByLabelText('Local activo')).not.toBeChecked();
 fireEvent.change(screen.getByLabelText('Nombre del local'),{target:{value:'Borrador'}});
 view.rerender(<NewLocationSheet {...props} location={{...location}}/>);
 expect(screen.getByLabelText('Nombre del local')).toHaveValue('Borrador');
 view.rerender(<NewLocationSheet {...props} location={{...location,id:'other',name:'Otro local'}}/>);
 expect(screen.getByLabelText('Nombre del local')).toHaveValue('Otro local');
});
it('blocks fields and actions while saving', () => {
 render(<NewLocationSheet {...props} location={location} busy/>);
 expect(screen.getByRole('button',{name:'Guardando local…'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Cancelar'})).toBeDisabled();
 expect(screen.getByLabelText('Teléfono')).toBeDisabled();
});
