import { IonSpinner } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

const BRAND_FLOW_PATHS = new Set(['/welcome', '/app/agilito']);

export function BrandTransitionOverlay() {
  const { t } = useTranslation();
  const { brandLoading } = useApp();
  const { pathname } = useLocation();

  if (!brandLoading || !BRAND_FLOW_PATHS.has(pathname)) {
    return null;
  }

  return (
    <div className="brand-transition-overlay" aria-live="polite" aria-busy="true">
      <IonSpinner name="crescent" />
      <p>{t('app.loading')}</p>
    </div>
  );
}
