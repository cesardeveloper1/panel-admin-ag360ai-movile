import { IonIcon, IonContent, IonPage } from '@ionic/react';
import {
  businessOutline,
  colorPaletteOutline,
  megaphoneOutline,
  restaurantOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { brandLabel } from '../utils/brandLabel';

const modules = [
  {
    path: '/app/products',
    icon: restaurantOutline,
    titleKey: 'payments.menuTitle',
    descKey: 'payments.menuDesc',
    tone: 'pulse',
  },
  {
    path: '/app/clients',
    icon: megaphoneOutline,
    titleKey: 'payments.marketingTitle',
    descKey: 'payments.marketingDesc',
    tone: 'hot',
  },
  {
    path: '/app/locations',
    icon: businessOutline,
    titleKey: 'payments.locationsTitle',
    descKey: 'payments.locationsDesc',
    tone: 'done',
  },
  {
    path: '/app/datos-marca',
    icon: colorPaletteOutline,
    titleKey: 'payments.brandTitle',
    descKey: 'payments.brandDesc',
    tone: 'ink',
  },
] as const;

const PaymentsHubPage: React.FC = () => {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { brand } = useApp();

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
          <AppHeader
            title={t('payments.title')}
            subtitle={brandLabel(brand, t)}
            avatar={brand?.initials}
            showAlerts
          />
          <div className="ag-body module-body ag-page-stack">
            <p className="hub-intro ag-enter">{t('payments.intro')}</p>
            <div className="hub-grid">
              {modules.map((mod, idx) => (
                <button
                  key={mod.path}
                  type="button"
                  className={`hub-card hub-card--${mod.tone} ag-enter`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  onClick={() => go(mod.path)}
                >
                  <span className="hub-card-icon">
                    <IonIcon icon={mod.icon} />
                  </span>
                  <span className="hub-card-copy">
                    <strong>{t(mod.titleKey)}</strong>
                    <span>{t(mod.descKey)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default PaymentsHubPage;
