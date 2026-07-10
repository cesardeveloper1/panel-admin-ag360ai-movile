import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export function BrandBootShell() {
  const { t } = useTranslation();

  return (
    <IonPage>
      <IonContent className="ag-screen welcome-screen">
        <div className="welcome-loading">
          <IonSpinner name="crescent" />
          <p>{t('app.loading')}</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
