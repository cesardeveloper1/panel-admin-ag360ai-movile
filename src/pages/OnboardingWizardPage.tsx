import { useEffect, useState } from 'react';
import { IonButton, IonContent, IonItem, IonLabel, IonPage, IonToggle } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { useApp } from '../hooks/useApp';
import { apiMock } from '../services/apiMock';
import { LOGO_COLOR_LOCAL } from '../constants/assets';
import { brandLabel } from '../utils/brandLabel';

const STEPS = ['welcome', 'modules', 'ready'] as const;

const OnboardingWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { brand, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [agentEnabled, setAgentEnabled] = useState(false);

  useEffect(() => {
    if (!brand) return;
    void apiMock.getBrandConfig(brand.id).then((config) => {
      setAgentEnabled(config.agentEnabled ?? false);
    });
  }, [brand]);

  const finish = async () => {
    if (brand) {
      const config = await apiMock.getBrandConfig(brand.id);
      await apiMock.saveBrandConfig({ ...config, agentEnabled });
    }
    completeOnboarding();
    history.replace('/app/agilito');
  };

  const next = () => {
    if (step >= STEPS.length - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const current = STEPS[step];
  const brandName = brandLabel(brand, t);

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppHeader
          title={t('onboarding.title')}
          subtitle={brandName}
          avatar={brand?.initials}
        />
        <div className="ag-body onboarding-body">
          <div className="onboarding-progress" aria-hidden="true">
            {STEPS.map((_, idx) => (
              <span key={idx} className={`onboarding-dot${idx <= step ? ' active' : ''}`} />
            ))}
          </div>

          {current === 'welcome' ? (
            <section className="onboarding-panel">
              <img src={LOGO_COLOR_LOCAL} alt="" className="onboarding-logo" />
              <h2>{t('onboarding.welcomeTitle', { brand: brandName })}</h2>
              <p>{t('onboarding.welcomeBody')}</p>
              <IonItem className="onboarding-toggle" lines="none">
                <IonLabel>
                  <h3>{t('onboarding.agentTitle')}</h3>
                  <p>{t('onboarding.agentHint')}</p>
                </IonLabel>
                <IonToggle
                  slot="end"
                  checked={agentEnabled}
                  onIonChange={(e) => setAgentEnabled(e.detail.checked)}
                />
              </IonItem>
            </section>
          ) : null}

          {current === 'modules' ? (
            <section className="onboarding-panel">
              <h2>{t('onboarding.modulesTitle')}</h2>
              <ul className="onboarding-modules">
                <li>
                  <strong>{t('nav.orders')}</strong>
                  <span>{t('onboarding.opsHint')}</span>
                </li>
                <li>
                  <strong>{t('nav.reports')}</strong>
                  <span>{t('onboarding.reportsHint')}</span>
                </li>
                <li>
                  <strong>{t('nav.payments')}</strong>
                  <span>{t('onboarding.paymentsHint')}</span>
                </li>
                <li>
                  <strong>{t('nav.agilito')}</strong>
                  <span>{t('onboarding.agilitoHint')}</span>
                </li>
              </ul>
            </section>
          ) : null}

          {current === 'ready' ? (
            <section className="onboarding-panel">
              <h2>{t('onboarding.readyTitle')}</h2>
              <p>{t('onboarding.readyBody')}</p>
            </section>
          ) : null}

          <div className="onboarding-actions">
            {step > 0 ? (
              <IonButton fill="outline" onClick={() => setStep((s) => s - 1)}>
                {t('onboarding.back')}
              </IonButton>
            ) : (
              <IonButton fill="clear" onClick={() => void finish()}>
                {t('onboarding.skip')}
              </IonButton>
            )}
            <IonButton onClick={next}>
              {step >= STEPS.length - 1 ? t('onboarding.start') : t('onboarding.next')}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OnboardingWizardPage;
