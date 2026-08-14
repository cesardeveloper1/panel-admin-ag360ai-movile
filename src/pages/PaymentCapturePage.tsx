import { useCallback, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { IonButton, IonIcon, IonSelect, IonSelectOption, IonSpinner } from '@ionic/react';
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  notificationsOutline,
  openOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { useApp } from '../context/AppContext';
import { locationService } from '../services/locationService';
import { paymentCaptureService } from '../services/paymentCaptureService';
import type { BranchLocation } from '../types';
import {
  paymentNotificationCapture,
  type PaymentCaptureDiagnostics,
} from '../native/paymentNotificationCapture';

type CaptureViewState =
  | { status: 'loading' }
  | { status: 'permission-required'; diagnostics: PaymentCaptureDiagnostics }
  | { status: 'not-configured'; diagnostics: PaymentCaptureDiagnostics }
  | { status: 'listening'; diagnostics: PaymentCaptureDiagnostics }
  | { status: 'error'; diagnostics?: PaymentCaptureDiagnostics };

const PaymentCapturePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { brand } = useApp();
  const [viewState, setViewState] = useState<CaptureViewState>({ status: 'loading' });
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [bindingBusy, setBindingBusy] = useState(false);

  const refreshDiagnostics = useCallback(async () => {
    try {
      const diagnostics = await paymentNotificationCapture.getDiagnostics();
      if (diagnostics.bindingState === 'blocked') {
        setViewState({ status: 'error', diagnostics });
      } else if (!diagnostics.permissionGranted) {
        setViewState({ status: 'permission-required', diagnostics });
      } else if (diagnostics.bindingState !== 'linked') {
        setViewState({ status: 'not-configured', diagnostics });
      } else if (!diagnostics.listenerConnected) {
        setViewState({ status: 'not-configured', diagnostics });
      } else {
        setViewState({ status: 'listening', diagnostics });
      }
    } catch {
      setViewState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!brand?.id) return;
    void locationService.list(brand.id).then((items) => {
      if (!active) return;
      const enabled = items.filter((item) => item.active);
      setLocations(enabled);
      setSelectedBranchId((current) => current || enabled[0]?.id || '');
    }).catch(() => {
      if (active) setLocations([]);
    });
    return () => { active = false; };
  }, [brand?.id]);

  useEffect(() => {
    void refreshDiagnostics();

    const appStateHandle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      void refreshDiagnostics();
      window.setTimeout(() => void refreshDiagnostics(), 900);
    });
    const captureHandle = paymentNotificationCapture
      .onCaptured(() => void refreshDiagnostics())
      .catch(() => undefined);
    const diagnosticsTimer = window.setInterval(() => void refreshDiagnostics(), 5_000);

    return () => {
      window.clearInterval(diagnosticsTimer);
      void appStateHandle.then((handle) => handle.remove());
      void captureHandle.then((handle) => handle?.remove());
    };
  }, [refreshDiagnostics]);

  const diagnostics = viewState.status === 'loading' ? undefined : viewState.diagnostics;
  const statePresentation = (() => {
    switch (viewState.status) {
      case 'loading':
        return {
          icon: notificationsOutline,
          tone: 'neutral',
          title: t('paymentCapture.loadingTitle'),
          body: t('paymentCapture.loadingBody'),
        };
      case 'permission-required':
        return {
          icon: shieldCheckmarkOutline,
          tone: 'warning',
          title: t('paymentCapture.permissionTitle'),
          body: t('paymentCapture.permissionBody'),
        };
      case 'not-configured':
        return {
          icon: notificationsOutline,
          tone: 'warning',
          title: t('paymentCapture.notConfiguredTitle'),
          body: t('paymentCapture.notConfiguredBody'),
        };
      case 'listening':
        return {
          icon: checkmarkCircleOutline,
          tone: 'success',
          title: t('paymentCapture.listeningTitle'),
          body: t('paymentCapture.listeningBody'),
        };
      case 'error':
        return {
          icon: alertCircleOutline,
          tone: 'danger',
          title: t('paymentCapture.errorTitle'),
          body: t('paymentCapture.errorBody'),
        };
      default: {
        const exhaustive: never = viewState;
        return exhaustive;
      }
    }
  })();

  const openSettings = async () => {
    try {
      await paymentNotificationCapture.openSettings();
    } catch {
      setViewState({ status: 'error', diagnostics });
    }
  };

  const pairDevice = async () => {
    if (!selectedBranchId || bindingBusy) return;
    setBindingBusy(true);
    try {
      const pairing = await paymentCaptureService.createPairingTicket(selectedBranchId);
      await paymentNotificationCapture.pairDevice({
        ticket: pairing.ticket,
        trackerBaseUrl: paymentCaptureService.trackerBaseUrl(),
      });
      await refreshDiagnostics();
    } catch {
      setViewState({ status: 'error', diagnostics });
    } finally {
      setBindingBusy(false);
    }
  };

  const unlinkDevice = async () => {
    if (bindingBusy) return;
    setBindingBusy(true);
    try {
      await paymentNotificationCapture.unlinkDevice();
      await refreshDiagnostics();
    } finally {
      setBindingBusy(false);
    }
  };

  const retryFailed = async () => {
    if (bindingBusy) return;
    setBindingBusy(true);
    try {
      await paymentNotificationCapture.retryFailed();
      await refreshDiagnostics();
    } finally {
      setBindingBusy(false);
    }
  };

  return (
    <StackLayout
      title={t('paymentCapture.title')}
      showAlerts={false}
      bodyClassName="ag-body payment-capture-body"
    >
      <section className={`payment-capture-status payment-capture-status--${statePresentation.tone}`}>
        <div className="payment-capture-icon">
          {viewState.status === 'loading' ? (
            <IonSpinner name="crescent" />
          ) : (
            <IonIcon icon={statePresentation.icon} />
          )}
        </div>
        <p className="payment-capture-eyebrow">{t('paymentCapture.yapeOnly')}</p>
        <h2>{statePresentation.title}</h2>
        <p>{statePresentation.body}</p>
        {viewState.status !== 'loading' ? (
          <IonButton expand="block" className="payment-capture-cta" onClick={() => void openSettings()}>
            {t('paymentCapture.openSettings')}
            <IonIcon icon={openOutline} slot="end" />
          </IonButton>
        ) : null}
      </section>

      <section className="payment-capture-details">
        <h3>{t('paymentCapture.diagnostics')}</h3>
        {diagnostics?.bindingState !== 'linked' ? (
          <div className="payment-capture-pairing">
            <IonSelect
              value={selectedBranchId}
              label={t('paymentCapture.location')}
              labelPlacement="stacked"
              placeholder={t('paymentCapture.selectLocation')}
              interface="action-sheet"
              onIonChange={(event) => setSelectedBranchId(String(event.detail.value ?? ''))}
            >
              {locations.map((location) => (
                <IonSelectOption key={location.id} value={location.id}>
                  {location.name ?? t('paymentCapture.unnamedLocation')}
                </IonSelectOption>
              ))}
            </IonSelect>
            <IonButton
              expand="block"
              disabled={!selectedBranchId || bindingBusy || diagnostics?.bindingState === 'unlink_pending'}
              onClick={() => void pairDevice()}
            >
              {bindingBusy ? <IonSpinner name="crescent" /> : t('paymentCapture.linkDevice')}
            </IonButton>
          </div>
        ) : (
          <div className="payment-capture-linked">
            <strong>{diagnostics.branchName || t('paymentCapture.linkedLocation')}</strong>
            <span>{diagnostics.deviceId}</span>
            <IonButton fill="clear" color="danger" disabled={bindingBusy} onClick={() => void unlinkDevice()}>
              {t('paymentCapture.unlinkDevice')}
            </IonButton>
          </div>
        )}
        <dl>
          <div>
            <dt>{t('paymentCapture.binding')}</dt>
            <dd>{t(`paymentCapture.bindingStates.${diagnostics?.bindingState ?? 'unlinked'}`)}</dd>
          </div>
          <div>
            <dt>{t('paymentCapture.permission')}</dt>
            <dd>{diagnostics?.permissionGranted ? t('common.enabled') : t('common.disabled')}</dd>
          </div>
          <div>
            <dt>{t('paymentCapture.listener')}</dt>
            <dd>{diagnostics?.listenerConnected ? t('paymentCapture.connected') : t('paymentCapture.disconnected')}</dd>
          </div>
          <div>
            <dt>{t('paymentCapture.pending')}</dt>
            <dd>{diagnostics?.pendingCount ?? 0}</dd>
          </div>
          <div>
            <dt>{t('paymentCapture.failed')}</dt>
            <dd>{diagnostics?.deadLetterCount ?? 0}</dd>
          </div>
          <div>
            <dt>{t('paymentCapture.lastAck')}</dt>
            <dd>
              {diagnostics?.lastAckAt
                ? new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(diagnostics.lastAckAt))
                : t('paymentCapture.never')}
            </dd>
          </div>
          <div>
            <dt>{t('paymentCapture.lastCapture')}</dt>
            <dd>
              {diagnostics?.lastAcceptedAt
                ? new Intl.DateTimeFormat(i18n.language, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(diagnostics.lastAcceptedAt))
                : t('paymentCapture.never')}
            </dd>
          </div>
        </dl>
        {(diagnostics?.deadLetterCount ?? 0) > 0 ? (
          <IonButton fill="outline" expand="block" disabled={bindingBusy} onClick={() => void retryFailed()}>
            {t('paymentCapture.retryFailed')}
          </IonButton>
        ) : null}
        <p className="payment-capture-privacy">{t('paymentCapture.privacy')}</p>
      </section>
    </StackLayout>
  );
};

export default PaymentCapturePage;
