import { useEffect, useId, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { eyeOffOutline, eyeOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { LOGO_WHITE_LOCAL } from '../constants/assets';
import { config } from '../config/env';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const { goRoot } = useAppNavigation();
  const { session, login, loading, showToast } = useApp();
  const [email, setEmail] = useState(config.useApiMock ? t('auth.demoOwner') : '');
  const [password, setPassword] = useState(config.useApiMock ? 'demo' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const passwordId = useId();

  useEffect(() => {
    if (session) goRoot('/welcome');
  }, [session, goRoot]);

  const onSubmit = async () => {
    setError(null);
    const ok = await login(email, password);
    if (ok) {
      goRoot('/welcome');
      return;
    }
    const message = t('auth.loginFailed');
    setError(message);
    showToast('auth.loginFailed');
  };

  return (
    <IonPage className="login-page">
      <IonContent fullscreen className="login-content-ion">
        <div className="login-scene" aria-hidden="true">
          <div className="login-bg" />
          <div className="login-overlay" />
          <div className="login-overlay-2" />
          <div className="login-glow login-glow--a" />
          <div className="login-glow login-glow--b" />
        </div>

        <div className="login-content">
          <form
            className="login-card"
            method="post"
            autoComplete="on"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <header className="login-card-head">
              <img className="login-logo" src={LOGO_WHITE_LOCAL} alt={t('app.name')} />
            </header>

            <div className="login-fields">
              <label className="login-field" htmlFor={emailId}>
                <span className="login-field__label">{t('auth.email')}</span>
                <span className="login-field__control">
                  <IonIcon icon={mailOutline} className="login-field__leading" aria-hidden="true" />
                  <input
                    id={emailId}
                    name="username"
                    className="login-field__input"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={t('auth.emailPlaceholder')}
                  />
                </span>
              </label>

              <label className="login-field" htmlFor={passwordId}>
                <span className="login-field__label">{t('auth.password')}</span>
                <span className="login-field__control">
                  <IonIcon icon={lockClosedOutline} className="login-field__leading" aria-hidden="true" />
                  <input
                    id={passwordId}
                    name="password"
                    className="login-field__input login-field__input--password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    className="login-field__toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    aria-pressed={showPassword}
                  >
                    <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
                  </button>
                </span>
              </label>
            </div>

            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="login-links">
              <a href="#">{t('auth.forgot')}</a>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? <IonSpinner name="crescent" /> : t('auth.login')}
            </button>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
