import { useApp } from '../context/AppContext';

export function ToastUx() {
  const { toast } = useApp();
  return <div className={`toast-ux${toast ? ' show' : ''}`}>{toast ?? ''}</div>;
}
