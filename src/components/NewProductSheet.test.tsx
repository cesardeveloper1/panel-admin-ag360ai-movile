import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import NewProductSheet from './NewProductSheet';
import '../i18n';
vi.mock('@ionic/react', () => {
 const Box = ({children}: {children?: ReactNode}) => <div>{children}</div>;
 return {IonModal: ({children,isOpen}: {children?:ReactNode;isOpen:boolean}) => isOpen ? <div>{children}</div> : null,
 IonHeader:Box,IonTitle:Box,IonToolbar:Box,IonSpinner:Box,
 IonInput: ({value,onIonInput,disabled,'aria-label':label}: {value:string;onIonInput:(e:{detail:{value:string}})=>void;disabled:boolean;'aria-label':string}) => <input aria-label={label} value={value} disabled={disabled} onChange={e=>onIonInput({detail:{value:e.target.value}})} />,
 IonToggle: ({checked,onIonChange,disabled,'aria-label':label}: {checked:boolean;onIonChange:(e:{detail:{checked:boolean}})=>void;disabled:boolean;'aria-label':string}) => <input type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={e=>onIonChange({detail:{checked:e.target.checked}})} />};
});
afterEach(cleanup);
const props = {open:true,categories:[{id:'demo',name:'Demo'}],brandId:'demo',onDismiss:vi.fn(),onSubmit:vi.fn()};
it('requires an explicit price while allowing an intentional zero', () => {
 const submit=vi.fn();render(<NewProductSheet {...props} onSubmit={submit}/>);
 fireEvent.change(screen.getByLabelText('Nombre del producto'),{target:{value:'Prueba'}});
 expect(screen.getByRole('button',{name:'Crear producto'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Precio base (S/)'),{target:{value:'0'}});
 fireEvent.click(screen.getByRole('button',{name:'Crear producto'}));
 expect(submit).toHaveBeenCalledWith(expect.objectContaining({name:'Prueba',price:0,categoryId:'demo'}));
});
it('preserves the entered name when categories refresh', () => {
 const view=render(<NewProductSheet {...props}/>);
 fireEvent.change(screen.getByLabelText('Nombre del producto'),{target:{value:'Mi producto'}});
 view.rerender(<NewProductSheet {...props} categories={[{id:'demo',name:'Actualizada'}]}/>);
 expect(screen.getByLabelText('Nombre del producto')).toHaveValue('Mi producto');
});
it('explains the missing category and prevents saving while busy', () => {
 const view=render(<NewProductSheet {...props} categories={[]}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Primero crea una categoría');
 view.rerender(<NewProductSheet {...props} busy/>);
 expect(screen.getByRole('button',{name:'Creando producto…'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Cancelar'})).toBeDisabled();
});
