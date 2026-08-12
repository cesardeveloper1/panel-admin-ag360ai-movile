import { useEffect, useState } from 'react';
import { IonButton, IonHeader, IonInput, IonModal, IonTitle, IonToggle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import type { LocationFormInput } from '../services/locationService';
import type { BranchLocation } from '../types';

interface NewLocationSheetProps {
  open: boolean;
  busy?: boolean;
  location?: BranchLocation | null;
  onDismiss: () => void;
  onSubmit: (input: LocationFormInput) => void | Promise<void>;
}

const NewLocationSheet: React.FC<NewLocationSheetProps> = ({
  open,
  busy = false,
  location = null,
  onDismiss,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(location?.name ?? '');
    setAddress(location?.address ?? '');
    setPhone(location?.phone === '—' ? '' : location?.phone ?? '');
    setActive(location?.active ?? true);
  }, [location, open]);

  const canSubmit = Boolean(name.trim() && address.trim() && phone.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;
    void onSubmit({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      active,
    });
  };

  const modeKey = location ? 'locationsPage.editForm' : 'locationsPage.create';

  return (
    <IonModal isOpen={open} onDidDismiss={onDismiss} className="new-product-modal">
      <IonHeader className="new-product-modal__header">
        <IonToolbar><IonTitle>{t(`${modeKey}.title`)}</IonTitle></IonToolbar>
      </IonHeader>
      <div className="new-product-sheet">
        <div className="new-product-sheet__intro">{t(`${modeKey}.description`)}</div>
        <label className="ag-field new-product-field">
          <span>{t('locationsPage.create.name')}</span>
          <IonInput value={name} placeholder={t('locationsPage.create.namePlaceholder')} onIonInput={(event) => setName(String(event.detail.value ?? ''))} disabled={busy} />
        </label>
        <label className="ag-field new-product-field">
          <span>{t('locationsPage.create.address')}</span>
          <IonInput value={address} placeholder={t('locationsPage.create.addressPlaceholder')} onIonInput={(event) => setAddress(String(event.detail.value ?? ''))} disabled={busy} />
        </label>
        <label className="ag-field new-product-field">
          <span>{t('locationsPage.create.phone')}</span>
          <IonInput value={phone} type="tel" inputMode="tel" placeholder={t('locationsPage.create.phonePlaceholder')} onIonInput={(event) => setPhone(String(event.detail.value ?? ''))} disabled={busy} />
        </label>
        <div className="new-product-availability">
          <div>
            <strong>{t('locationsPage.create.active')}</strong>
            <span>{t('locationsPage.create.activeHint')}</span>
          </div>
          <IonToggle checked={active} onIonChange={(event) => setActive(event.detail.checked)} disabled={busy} />
        </div>
        <div className="new-product-actions">
          <IonButton fill="clear" onClick={onDismiss} disabled={busy}>{t('common.cancel')}</IonButton>
          <IonButton onClick={handleSubmit} disabled={busy || !canSubmit}>{t(`${modeKey}.submit`)}</IonButton>
        </div>
      </div>
    </IonModal>
  );
};

export default NewLocationSheet;
