import { useTranslation } from 'react-i18next';
import { BusinessModuleGrid } from '../components/BusinessModuleGrid';
import { TabLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { BUSINESS_HUB_PATH } from '../navigation/appRouteRegistry';
import { setModuleNavFrom } from '../navigation/moduleNavFrom';
import { brandLabel } from '../utils/brandLabel';

const BusinessHubPage: React.FC = () => {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { brand } = useApp();

  return (
    <TabLayout
      title={t('business.title')}
      subtitle={brandLabel(brand, t)}
      avatar={brand?.initials}
      showAlerts
      centeredCompact={false}
      bodyClassName="ag-body module-body"
    >
      <p className="hub-intro ag-enter">{t('business.intro')}</p>
      <BusinessModuleGrid
        titleKey={(mod) => mod.i18n.businessTitle}
        descKey={(mod) => mod.i18n.businessDesc}
        onSelect={(mod) => {
          setModuleNavFrom(BUSINESS_HUB_PATH);
          go(mod.path);
        }}
      />
    </TabLayout>
  );
};

export default BusinessHubPage;
