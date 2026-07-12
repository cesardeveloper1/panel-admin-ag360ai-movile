import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LOGO_WHITE_LOCAL } from '../constants/assets';

export function AppLaunchSplash() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setVisible(false), 2000);
    const removeTimer = window.setTimeout(() => setMounted(false), 2500);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`app-launch-splash${visible ? ' is-visible' : ''}`}
      role="status"
      aria-label={t('app.loading')}
    >
      <img src={LOGO_WHITE_LOCAL} alt={t('app.name')} />
    </div>
  );
}
