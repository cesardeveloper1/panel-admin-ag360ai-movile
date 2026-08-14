import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { phonePortraitOutline, printOutline } from 'ionicons/icons';
import { BusinessModuleGrid } from '../components/BusinessModuleGrid';
import { TabLayout } from '../components/layouts';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PAYMENTS_PATH } from '../navigation/navConfig';
import { PAYMENT_CAPTURE_PATH, PRINTING_PATH } from '../navigation/appRouteRegistry';
import { setModuleNavFrom } from '../navigation/moduleNavFrom';

const PaymentsHubPage: React.FC = () => {
  const { t } = useTranslation();
  const { go } = useAppNavigation();

  return (
    <TabLayout title={t('payments.title')} centeredCompact>
      <p className="hub-intro ag-enter">{t('payments.intro')}</p>
      <BusinessModuleGrid
        titleKey={(mod) => mod.i18n.paymentsTitle}
        descKey={(mod) => mod.i18n.paymentsDesc}
        onSelect={(mod) => {
          setModuleNavFrom(PAYMENTS_PATH);
          go(mod.path);
        }}
      >
        <button
          type="button"
          className="hub-card hub-card--pulse ag-enter"
          style={{ animationDelay: '240ms' }}
          onClick={() => go(PAYMENT_CAPTURE_PATH)}
        >
          <span className="hub-card-icon">
            <IonIcon icon={phonePortraitOutline} />
          </span>
          <span className="hub-card-copy">
            <strong>{t('paymentCapture.hubTitle')}</strong>
            <span>{t('paymentCapture.hubDesc')}</span>
          </span>
        </button>
        <button
          type="button"
          className="hub-card hub-card--pulse ag-enter"
          style={{ animationDelay: '300ms' }}
          onClick={() => go(PRINTING_PATH)}
        >
          <span className="hub-card-icon">
            <IonIcon icon={printOutline} />
          </span>
          <span className="hub-card-copy">
            <strong>{t('printing.hubTitle')}</strong>
            <span>{t('printing.hubDesc')}</span>
          </span>
        </button>
      </BusinessModuleGrid>
    </TabLayout>
  );
};

export default PaymentsHubPage;
