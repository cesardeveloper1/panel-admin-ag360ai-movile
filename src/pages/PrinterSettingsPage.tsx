import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToggle,
} from '@ionic/react';
import {
  bluetoothOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  printOutline,
  refreshOutline,
  warningOutline,
  wifiOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { useApp } from '../context/AppContext';
import { thermalPrinter } from '../native/thermalPrinter';
import { locationService } from '../services/locationService';
import { mobilePrintCoordinator } from '../services/mobilePrintCoordinator';
import { mobilePrintSignals } from '../services/mobilePrintSignals';
import type { BranchLocation } from '../types';
import type {
  MobilePrinterConfig,
  PrinterCapabilities,
  PrinterDevice,
  PrinterPaperWidth,
  PrinterTicketMode,
  PrinterTransport,
} from '../types/mobilePrinting';

const DEFAULT_CONFIG: MobilePrinterConfig = {
  enabled: true,
  brandId: '',
  branchId: '',
  branchName: '',
  transport: 'tcp',
  deviceRef: '',
  displayName: '',
  host: '',
  port: 9100,
  paperWidthMm: 80,
  ticketMode: 'both',
  copies: 1,
};

const PrinterSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const [capabilities, setCapabilities] = useState<PrinterCapabilities | null>(null);
  const [locations, setLocations] = useState<BranchLocation[]>([]);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [config, setConfig] = useState<MobilePrinterConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [advancedNetworkOpen, setAdvancedNetworkOpen] = useState(false);

  const loadNativeState = useCallback(async () => {
    const nextCapabilities = await thermalPrinter.getCapabilities();
    setCapabilities(nextCapabilities);
    if (!nextCapabilities.available) return;
    const [saved] = await Promise.all([
      thermalPrinter.getConfig(),
    ]);
    if (saved) setConfig(saved);
  }, []);

  useEffect(() => {
    let alive = true;
    if (!brand?.id) return;
    setLoading(true);
    Promise.all([locationService.list(brand.id), loadNativeState()])
      .then(([nextLocations]) => {
        if (!alive) return;
        const active = nextLocations.filter((location) => location.active);
        setLocations(active);
        setConfig((current) => ({
          ...current,
          brandId: brand.id,
          branchId: current.brandId === brand.id ? current.branchId : (active[0]?.id || ''),
          branchName: current.brandId === brand.id ? current.branchName : (active[0]?.name || ''),
        }));
      })
      .catch(() => showToast('printing.loadError'))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [brand?.id, loadNativeState, showToast]);

  const availableTransports = capabilities?.transports ?? [];
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === config.branchId),
    [config.branchId, locations],
  );

  const patchConfig = <Key extends keyof MobilePrinterConfig>(
    key: Key,
    value: MobilePrinterConfig[Key],
  ) => setConfig((current) => ({ ...current, [key]: value }));

  const selectTransport = (transport: PrinterTransport) => {
    setConfig((current) => ({
      ...current,
      transport,
      deviceRef: transport === 'tcp' ? (current.host ?? '') : '',
      displayName: transport === 'tcp' ? t('printing.networkPrinter') : '',
    }));
  };

  const scanBluetooth = async () => {
    setBusy(true);
    try {
      const next = capabilities?.bluetoothPermission === 'granted'
        ? capabilities
        : await thermalPrinter.requestBluetoothPermissions();
      setCapabilities(next);
      setDevices(await thermalPrinter.listDevices());
    } catch {
      showToast('printing.permissionError');
    } finally {
      setBusy(false);
    }
  };

  const scanNetwork = async () => {
    setBusy(true);
    try {
      setDevices(await thermalPrinter.scanNetwork());
      showToast('printing.scanComplete');
    } catch {
      showToast('printing.scanError');
    } finally {
      setBusy(false);
    }
  };

  const normalizedConfig = (): MobilePrinterConfig => ({
    ...config,
    brandId: brand?.id ?? '',
    branchName: selectedLocation?.name ?? config.branchName,
      deviceRef: config.transport === 'tcp' ? (config.host?.trim() ?? '') : config.deviceRef,
    displayName: config.transport === 'tcp'
      ? `${config.host?.trim() ?? ''}:${config.port ?? 9100}`
      : config.displayName,
    port: config.port || 9100,
  });

  const isValid = Boolean(
    config.branchId &&
      (config.transport === 'tcp' ? config.host?.trim() : config.deviceRef),
  );

  const save = async () => {
    if (!isValid || !brand?.id) return;
    setBusy(true);
    try {
      const saved = await thermalPrinter.saveConfig(normalizedConfig());
      setConfig(saved);
      await mobilePrintCoordinator.sync(brand.id, 'configuration');
      mobilePrintSignals.notify();
      showToast('printing.saved');
    } catch {
      showToast('printing.saveError');
    } finally {
      setBusy(false);
    }
  };

  const testPrint = async () => {
    if (!isValid) return;
    setBusy(true);
    try {
      await thermalPrinter.saveConfig(normalizedConfig());
      await thermalPrinter.testPrint();
      showToast('printing.testSent');
    } catch {
      showToast('printing.testError');
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (enabled: boolean) => {
    patchConfig('enabled', enabled);
    if (enabled || !capabilities?.available) return;
    try {
      await thermalPrinter.saveConfig({ ...normalizedConfig(), enabled: false });
      await mobilePrintCoordinator.disableCurrentStation();
    } catch {
      showToast('printing.saveError');
    }
  };

  if (loading) {
    return (
      <StackLayout title={t('printing.title')} showAlerts={false}>
        <div className="printing-loading"><IonSpinner name="crescent" /></div>
      </StackLayout>
    );
  }

  if (!capabilities?.available) {
    return (
      <StackLayout title={t('printing.title')} showAlerts={false}>
        <section className="printing-empty ag-enter">
          <span className="printing-empty__icon"><IonIcon icon={printOutline} /></span>
          <h2>{t('printing.nativeOnlyTitle')}</h2>
          <p>{t('printing.nativeOnlyBody')}</p>
        </section>
      </StackLayout>
    );
  }

  return (
    <StackLayout title={t('printing.title')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack printing-page">
      <section className="printing-status-card ag-enter">
        <span className={`printing-status-card__icon ${config.enabled ? 'is-on' : ''}`}>
          <IonIcon icon={config.enabled ? checkmarkCircleOutline : warningOutline} />
        </span>
        <span><strong>{t(config.enabled ? 'printing.active' : 'printing.paused')}</strong><small>{t('printing.statusHint')}</small></span>
        <IonToggle checked={config.enabled} onIonChange={(event) => void toggleEnabled(event.detail.checked)} aria-label={t('printing.autoPrint')} />
      </section>

      <section className="printing-card ag-enter">
        <h2>{t('printing.destination')}</h2>
        <label className="printing-field">
          <span>{t('printing.location')}</span>
          <IonSelect value={config.branchId} interface="popover" onIonChange={(event) => {
            const branchId = String(event.detail.value ?? '');
            const location = locations.find((item) => item.id === branchId);
            setConfig((current) => ({ ...current, branchId, branchName: location?.name ?? '' }));
          }}>
            {locations.map((location) => <IonSelectOption key={location.id} value={location.id}>{location.name}</IonSelectOption>)}
          </IonSelect>
        </label>

        <div className="printing-transport" role="group" aria-label={t('printing.transport')}>
          {availableTransports.includes('tcp') && (
            <button type="button" className={config.transport === 'tcp' ? 'is-selected' : ''} onClick={() => selectTransport('tcp')}>
              <IonIcon icon={wifiOutline} /><span><strong>{t('printing.tcp')}</strong><small>{t('printing.tcpHint')}</small></span>
            </button>
          )}
          {availableTransports.includes('bluetooth-classic') && (
            <button type="button" className={config.transport === 'bluetooth-classic' ? 'is-selected' : ''} onClick={() => selectTransport('bluetooth-classic')}>
              <IonIcon icon={bluetoothOutline} /><span><strong>Bluetooth</strong><small>{t('printing.bluetoothHint')}</small></span>
            </button>
          )}
        </div>

        {config.transport === 'tcp' ? (
          <div className="printing-network-setup">
            <div className="printing-network-discovery">
              <IonButton fill="outline" expand="block" disabled={busy} onClick={() => void scanNetwork()}><IonIcon slot="start" icon={refreshOutline} />{t('printing.findNetworkPrinters')}</IonButton>
              {devices.length > 0 && <label className="printing-field"><span>{t('printing.printer')}</span><IonSelect value={config.host} interface="popover" placeholder={t('printing.selectPrinter')} onIonChange={(event) => {
                const host = String(event.detail.value ?? '');
                const device = devices.find((item) => (item.host ?? item.id) === host);
                setConfig((current) => ({ ...current, host, port: device?.port ?? 9100, deviceRef: host, displayName: device?.name ?? `${host}:9100` }));
              }}>{devices.map((device) => <IonSelectOption key={device.id} value={device.host ?? device.id}>{device.name} · {device.host ?? device.id}</IonSelectOption>)}</IonSelect></label>}
            </div>
            <button type="button" className={`printing-advanced-toggle${advancedNetworkOpen ? ' is-open' : ''}`} onClick={() => setAdvancedNetworkOpen((open) => !open)} aria-expanded={advancedNetworkOpen}>
              <span><strong>{t('printing.advanced')}</strong><small>{t('printing.advancedHint')}</small></span>
              <IonIcon icon={advancedNetworkOpen ? chevronUpOutline : chevronDownOutline} aria-hidden="true" />
            </button>
            {advancedNetworkOpen ? <div className="printing-address-grid printing-advanced-fields"><label className="printing-field"><span>{t('printing.host')}</span><IonInput value={config.host} inputmode="decimal" placeholder="192.168.1.50" onIonInput={(event) => patchConfig('host', String(event.detail.value ?? ''))} /></label>
              <label className="printing-field"><span>{t('printing.port')}</span><IonInput type="number" value={config.port} min="1" max="65535" onIonInput={(event) => patchConfig('port', Number(event.detail.value) || 9100)} /></label>
            </div> : null}
          </div>
        ) : (
          <div className="printing-bluetooth">
            <IonButton fill="outline" expand="block" disabled={busy} onClick={() => void scanBluetooth()}><IonIcon slot="start" icon={refreshOutline} />{t('printing.findPrinters')}</IonButton>
            {devices.length > 0 && <label className="printing-field"><span>{t('printing.printer')}</span><IonSelect value={config.deviceRef} interface="popover" placeholder={t('printing.selectPrinter')} onIonChange={(event) => {
              const deviceRef = String(event.detail.value ?? '');
              const device = devices.find((item) => item.id === deviceRef);
              setConfig((current) => ({ ...current, deviceRef, displayName: device?.name ?? deviceRef }));
            }}>{devices.map((device) => <IonSelectOption key={device.id} value={device.id}>{device.name}</IonSelectOption>)}</IonSelect></label>}
          </div>
        )}
      </section>

      <section className="printing-card ag-enter">
        <h2>{t('printing.ticket')}</h2>
        <div className="printing-options-grid">
          <label className="printing-field"><span>{t('printing.paper')}</span><IonSelect value={config.paperWidthMm} interface="popover" onIonChange={(event) => patchConfig('paperWidthMm', Number(event.detail.value) as PrinterPaperWidth)}><IonSelectOption value={58}>58 mm</IonSelectOption><IonSelectOption value={80}>80 mm</IonSelectOption></IonSelect></label>
          <label className="printing-field"><span>{t('printing.copies')}</span><IonSelect value={config.copies} interface="popover" onIonChange={(event) => patchConfig('copies', Number(event.detail.value))}>{[1, 2, 3].map((copies) => <IonSelectOption key={copies} value={copies}>{copies}</IonSelectOption>)}</IonSelect></label>
        </div>
        <label className="printing-field"><span>{t('printing.ticketType')}</span><IonSelect value={config.ticketMode} interface="popover" onIonChange={(event) => patchConfig('ticketMode', event.detail.value as PrinterTicketMode)}><IonSelectOption value="full">{t('printing.full')}</IonSelectOption><IonSelectOption value="kitchen">{t('printing.kitchen')}</IonSelectOption><IonSelectOption value="both">{t('printing.both')}</IonSelectOption></IonSelect></label>
      </section>

      <div className="printing-actions">
        <IonButton fill="outline" disabled={busy || !isValid} onClick={() => void testPrint()}>{t('printing.test')}</IonButton>
        <IonButton disabled={busy || !isValid} onClick={() => void save()}>{busy && <IonSpinner slot="start" name="crescent" />}{t('printing.save')}</IonButton>
      </div>

    </StackLayout>
  );
};

export default PrinterSettingsPage;
