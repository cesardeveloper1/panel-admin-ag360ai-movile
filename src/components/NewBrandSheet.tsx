import { useMemo, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonInput, IonModal, IonTitle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';

export interface NewBrandFormValues {
  name: string;
  subdomain: string;
}

interface NewBrandSheetProps {
  open: boolean;
  busy?: boolean;
  onDismiss: () => void;
  onSubmit: (values: NewBrandFormValues) => void | Promise<void>;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

const NewBrandSheet: React.FC<NewBrandSheetProps> = ({ open, busy, onDismiss, onSubmit }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [touchedSubdomain, setTouchedSubdomain] = useState(false);

  const autoSubdomain = useMemo(() => slugify(name), [name]);
  const effectiveSubdomain = touchedSubdomain ? subdomain : autoSubdomain;

  const reset = () => {
    setName('');
    setSubdomain('');
    setTouchedSubdomain(false);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const slug = slugify(effectiveSubdomain || trimmedName);
    if (!trimmedName || !slug) return;
    void onSubmit({ name: trimmedName, subdomain: slug });
  };

  return (
    <IonModal
      isOpen={open}
      onDidDismiss={() => {
        reset();
        onDismiss();
      }}
      className="new-brand-modal"
    >
      <IonHeader className="new-brand-modal-header">
        <IonToolbar>
          <IonTitle>{t('welcome.newBrandTitle')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="new-brand-sheet">
        <label className="ag-field new-brand-field">
          <span>{t('welcome.newBrandName')}</span>
          <IonInput
            value={name}
            placeholder={t('welcome.newBrandNamePh')}
            onIonInput={(e) => setName(String(e.detail.value ?? ''))}
          />
        </label>
        <label className="ag-field new-brand-field">
          <span>{t('welcome.newBrandSubdomain')}</span>
          <IonInput
            value={effectiveSubdomain}
            placeholder={t('welcome.newBrandSubdomainPh')}
            onIonInput={(e) => {
              setTouchedSubdomain(true);
              setSubdomain(String(e.detail.value ?? ''));
            }}
          />
        </label>
        <div className="new-brand-actions">
          <IonButton fill="outline" className="new-brand-btn new-brand-btn--ghost" onClick={onDismiss} disabled={busy}>
            {t('common.cancel')}
          </IonButton>
          <IonButton className="new-brand-btn" onClick={handleSubmit} disabled={busy || !name.trim()}>
            {t('welcome.newBrandSubmit')}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default NewBrandSheet;
