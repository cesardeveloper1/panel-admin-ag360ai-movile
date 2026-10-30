import { useEffect, useRef, useState } from 'react';
import { IonHeader, IonInput, IonModal, IonSpinner, IonTitle, IonToggle, IonToolbar } from '@ionic/react';
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
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) { initializedFor.current = null; return; }
    const formKey = location?.id ?? 'new';
    if (initializedFor.current === formKey) return;
    initializedFor.current = formKey;
    setName(location?.name ?? '');
    setAddress(location?.address ?? '');
    setPhone(location?.phone === '—' ? '' : location?.phone ?? '');
    setActive(location?.active ?? true);
  }, [location, open]);

  const canSubmit = Boolean(name.trim() && address.trim() && phone.trim());

  const handleSubmit = () => {
    if (busy || !canSubmit) return;
    void onSubmit({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      active,
    });
  };

  const modeKey = location ? 'locationsPage.editForm' : 'locationsPage.create';

  return (
    <IonModal isOpen={open} canDismiss={!busy} onDidDismiss={onDismiss} className="new-product-modal">
      <IonHeader className="new-product-modal__header">
        <IonToolbar><IonTitle>{t(`${modeKey}.title`)}</IonTitle></IonToolbar>
      </IonHeader>
      <form className="new-product-form" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
        <div className="new-product-sheet">
          <div className="new-product-sheet__intro">{t(`${modeKey}.description`)}</div>
          <label className="ag-field new-product-field">
            <span>{t('locationsPage.create.name')}</span>
            <IonInput aria-label={t('locationsPage.create.name')} value={name} placeholder={t('locationsPage.create.namePlaceholder')} onIonInput={(event) => setName(String(event.detail.value ?? ''))} disabled={busy} />
          </label>
          <label className="ag-field new-product-field">
            <span>{t('locationsPage.create.address')}</span>
            <IonInput aria-label={t('locationsPage.create.address')} value={address} placeholder={t('locationsPage.create.addressPlaceholder')} onIonInput={(event) => setAddress(String(event.detail.value ?? ''))} disabled={busy} />
          </label>
          <label className="ag-field new-product-field">
            <span>{t('locationsPage.create.phone')}</span>
            <IonInput aria-label={t('locationsPage.create.phone')} value={phone} type="tel" inputMode="tel" placeholder={t('locationsPage.create.phonePlaceholder')} onIonInput={(event) => setPhone(String(event.detail.value ?? ''))} disabled={busy} />
          </label>
          <div className="new-product-availability">
            <div>
              <strong>{t('locationsPage.create.active')}</strong>
              <span>{t('locationsPage.create.activeHint')}</span>
            </div>
            <IonToggle aria-label={t('locationsPage.create.active')} checked={active} onIonChange={(event) => setActive(event.detail.checked)} disabled={busy} />
          </div>
        </div>
        <div className="new-product-actions">
          <button type="button" className="ag-btn" onClick={onDismiss} disabled={busy}>{t('common.cancel')}</button>
          <button type="submit" className="ag-btn ag-btn--primary" disabled={busy || !canSubmit} aria-busy={busy}>
            {busy ? <IonSpinner name="crescent" aria-hidden="true" /> : null}
            {busy ? t('locationsPage.saving') : t(`${modeKey}.submit`)}
          </button>
        </div>
      </form>
    </IonModal>
  );
};

export default NewLocationSheet;
