import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { LOGO_WHITE_LOCAL } from '../constants/assets';

const BRAND_FLOW_PATHS = new Set(['/welcome', '/app/agilito']);

export function BrandTransitionOverlay() {
  const { t } = useTranslation();
  const { brandLoading } = useApp();
  const { pathname } = useLocation();
  const shouldShow = brandLoading && BRAND_FLOW_PATHS.has(pathname);
  const [mounted, setMounted] = useState(shouldShow);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), 360);
    return () => window.clearTimeout(timeout);
  }, [shouldShow]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`brand-transition-overlay${visible ? ' is-visible' : ''}`}
      aria-live="polite"
      aria-busy={shouldShow}
    >
      <div className="login-scene" aria-hidden="true">
        <div className="login-bg" />
        <div className="login-overlay" />
        <div className="login-overlay-2" />
        <div className="login-glow login-glow--a" />
        <div className="login-glow login-glow--b" />
      </div>
      <div className="brand-transition-overlay__content">
        <img
          className="brand-transition-overlay__logo"
          src={LOGO_WHITE_LOCAL}
          alt={t('app.name')}
        />
        <p>{t('app.loading')}</p>
      </div>
    </div>
  );
}
