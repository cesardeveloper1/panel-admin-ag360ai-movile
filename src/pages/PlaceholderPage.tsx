import { IonContent, IonPage } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';

interface PlaceholderPageProps {
  titleKey: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ titleKey }) => {
  const { t } = useTranslation();
  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
        <AppHeader title={t(titleKey)} />
        <div className="ag-body">
          <p className="welcome-desc">{t('app.loading')}</p>
        </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default PlaceholderPage;
