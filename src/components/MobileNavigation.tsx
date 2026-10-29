import { useEffect } from 'react';

/**
 * En teléfono la navegación es la hamburguesa del header.
 * Esta instancia única solo evita que quede el hueco del footer.
 */
export function MobileNavigation() {
  useEffect(() => {
    document.body.classList.remove('ag-primary-nav-visible');
    return () => document.body.classList.remove('ag-primary-nav-visible');
  }, []);
  return null;
}
