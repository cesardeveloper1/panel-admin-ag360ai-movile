import { useTranslation } from 'react-i18next';
import { BusinessModuleGrid } from '../components/BusinessModuleGrid';
import { TabLayout } from '../components/layouts';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { PAYMENTS_PATH } from '../navigation/navConfig';
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
      />
    </TabLayout>
  );
};

export default PaymentsHubPage;
