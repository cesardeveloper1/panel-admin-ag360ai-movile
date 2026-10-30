import { useEffect, useRef, useState } from 'react';
import { IonHeader, IonInput, IonModal, IonSpinner, IonTitle, IonToggle, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import type { CatalogCategory, CreateCatalogProductInput } from '../types';

interface NewProductSheetProps {
  open: boolean;
  busy?: boolean;
  categories: CatalogCategory[];
  brandId: string;
  onDismiss: () => void;
  onSubmit: (input: CreateCatalogProductInput) => void | Promise<void>;
}

const NewProductSheet: React.FC<NewProductSheetProps> = ({
  open,
  busy = false,
  categories,
  brandId,
  onDismiss,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) { wasOpen.current = false; return; }
    if (wasOpen.current) return;
    wasOpen.current = true;
    setName('');
    setCategoryId(categories[0]?.id ?? '');
    setPrice('');
    setActive(true);
  }, [categories, open]);

  const numericPrice = Number(price);
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const canSubmit = Boolean(name.trim() && price.trim() && selectedCategory && Number.isFinite(numericPrice) && numericPrice >= 0);

  const handleSubmit = () => {
    if (busy || !selectedCategory || !canSubmit) return;
    void onSubmit({
      brandId,
      name: name.trim(),
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      price: numericPrice,
      active,
    });
  };

  return (
    <IonModal
      isOpen={open}
      canDismiss={!busy}
      onDidDismiss={onDismiss}
      className="new-product-modal"
    >
      <IonHeader className="new-product-modal__header">
        <IonToolbar>
          <IonTitle>{t('menu.create.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <form className="new-product-form" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
        <div className="new-product-sheet">
          <div className="new-product-sheet__intro">{t('menu.create.description')}</div>
          <label className="ag-field new-product-field">
            <span>{t('menu.create.name')}</span>
            <IonInput
              aria-label={t('menu.create.name')}
              value={name}
              placeholder={t('menu.create.namePlaceholder')}
              onIonInput={(event) => setName(String(event.detail.value ?? ''))}
              disabled={busy}
            />
          </label>
          <label className="ag-field new-product-field">
            <span>{t('menu.create.category')}</span>
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={busy || categories.length === 0}>
              <option value="" disabled>{t('menu.create.categoryPlaceholder')}</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="ag-field new-product-field">
            <span>{t('menu.create.price')}</span>
            <IonInput
              aria-label={t('menu.create.price')}
              value={price}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              onIonInput={(event) => setPrice(String(event.detail.value ?? ''))}
              disabled={busy}
            />
          </label>
          {categories.length === 0 ? <p className="new-product-empty" role="status">{t('menu.create.noCategories')}</p> : null}
          <div className="new-product-availability">
            <div>
              <strong>{t('menu.create.publish')}</strong>
              <span>{t('menu.create.publishHint')}</span>
            </div>
            <IonToggle aria-label={t('menu.create.publish')} checked={active} onIonChange={(event) => setActive(event.detail.checked)} disabled={busy} />
          </div>
        </div>
        <div className="new-product-actions">
          <button type="button" className="ag-btn" onClick={onDismiss} disabled={busy}>{t('common.cancel')}</button>
          <button type="submit" className="ag-btn ag-btn--primary" disabled={busy || !canSubmit} aria-busy={busy}>
            {busy ? <IonSpinner name="crescent" aria-hidden="true" /> : null}
            {t(busy ? 'menu.create.saving' : 'menu.create.submit')}
          </button>
        </div>
      </form>
    </IonModal>
  );
};

export default NewProductSheet;
