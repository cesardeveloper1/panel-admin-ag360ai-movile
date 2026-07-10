import { IonIcon } from '@ionic/react';
import {
  businessOutline,
  colorPaletteOutline,
  megaphoneOutline,
  restaurantOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonContent, IonPage } from '@ionic/react';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { brandLabel } from '../utils/brandLabel';

const modules = [
  {
    path: '/app/products',
    icon: restaurantOutline,
    titleKey: 'business.menuTitle',
    descKey: 'business.menuDesc',
    tone: 'pulse',
  },
  {
    path: '/app/clients',
    icon: megaphoneOutline,
    titleKey: 'business.marketingTitle',
    descKey: 'business.marketingDesc',
    tone: 'hot',
  },
  {
    path: '/app/locations',
    icon: businessOutline,
    titleKey: 'business.locationsTitle',
    descKey: 'business.locationsDesc',
    tone: 'done',
  },
  {
    path: '/app/datos-marca',
    icon: colorPaletteOutline,
    titleKey: 'business.brandTitle',
    descKey: 'business.brandDesc',
    tone: 'ink',
  },
] as const;

const BusinessHubPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { brand } = useApp();

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
          <AppHeader
            title={t('business.title')}
            subtitle={brandLabel(brand, t)}
            avatar={brand?.initials}
            showAlerts
          />
          <div className="ag-body module-body">
            <p className="hub-intro ag-enter">{t('business.intro')}</p>
            <div className="hub-grid">
              {modules.map((mod, idx) => (
                <button
                  key={mod.path}
                  type="button"
                  className={`hub-card hub-card--${mod.tone} ag-enter`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  onClick={() => history.push(mod.path)}
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

export default BusinessHubPage;
