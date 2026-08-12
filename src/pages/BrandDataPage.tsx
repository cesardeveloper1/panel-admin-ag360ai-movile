import { useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { imageOutline, linkOutline, saveOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { StackLayout } from '../components/layouts';
import { useApp } from '../context/AppContext';
import { apiFacade } from '../services/apiFacade';
import type { BrandConfig } from '../types';
import { LOGO_COLOR_LOCAL } from '../constants/assets';

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const BrandDataPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const brandId = brand?.id;
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState<BrandConfig | null>(null);

  useEffect(() => {
    if (!brandId) {
      setForm(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void apiFacade.getBrandConfig(brandId)
      .then((data) => {
        if (active) setForm(data);
      })
      .catch(() => {
        if (active) showToast('toast.brandLoadError');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [brandId, showToast]);

  const patch = (partial: Partial<BrandConfig>) => {
    setForm((previous) => previous ? { ...previous, ...partial } : previous);
  };

  const onSave = async () => {
    if (!form || saving) return;
    setSaving(true);
    try {
      setForm(await apiFacade.saveBrandConfig(form));
      showToast('toast.brandSaved');
    } catch {
      showToast('toast.brandSaveError');
    } finally {
      setSaving(false);
    }
  };

  const onLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !brandId || uploadingLogo) return;
    if (!file.type.startsWith('image/') || file.size > MAX_LOGO_SIZE_BYTES) {
      showToast('toast.brandLogoInvalid');
      return;
    }
    setUploadingLogo(true);
    try {
      const logoUrl = await apiFacade.uploadBrandLogo(brandId, file);
      patch({ logoUrl });
      showToast('toast.brandLogoUpdated');
    } catch {
      showToast('toast.brandLogoError');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <StackLayout title={t('brandData.title')} showAlerts bodyClassName="ag-body brand-data-body">
      {loading || !form ? (
        <div className="module-loading"><IonSpinner name="crescent" /></div>
      ) : (
        <>
          <section className="brand-section">
            <div className="brand-section__head"><h2>{t('brandData.logo')}</h2><IonIcon icon={imageOutline} /></div>
            <div className="brand-logo-box"><img src={form.logoUrl || LOGO_COLOR_LOCAL} alt={t('brandData.logo')} /></div>
            <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void onLogoChange(event)} />
            <button type="button" className="ag-btn ag-btn--ghost brand-upload-btn" disabled={uploadingLogo} onClick={() => inputRef.current?.click()}>
              {uploadingLogo ? t('brandData.uploadingLogo') : t('brandData.uploadLogo')}
            </button>
            <p className="brand-hint">{t('brandData.logoHint')}</p>
          </section>

          <section className="brand-section">
            <div className="brand-section__head"><h2>{t('brandData.social')}</h2><IonIcon icon={linkOutline} /></div>
            <label className="brand-field brand-field--full">
              <span>Instagram</span>
              <div className="brand-input-wrap"><span className="brand-input-prefix">@</span><input value={form.instagram} onChange={(event) => patch({ instagram: event.target.value })} placeholder={t('brandData.instagramPh')} /></div>
            </label>
            <label className="brand-field brand-field--full">
              <span>Facebook</span>
              <div className="brand-input-wrap"><input value={form.facebook} onChange={(event) => patch({ facebook: event.target.value })} placeholder={t('brandData.facebookPh')} /></div>
            </label>
            <label className="brand-field brand-field--full">
              <span>WhatsApp</span>
              <div className="brand-input-wrap"><input type="tel" value={form.whatsapp} onChange={(event) => patch({ whatsapp: event.target.value })} placeholder={t('brandData.whatsappPh')} /></div>
            </label>
          </section>

          <button type="button" className="brand-save-btn" disabled={saving || uploadingLogo} onClick={() => void onSave()}>
            <IonIcon icon={saveOutline} />{saving ? t('brandData.saving') : t('brandData.save')}
          </button>
        </>
      )}
    </StackLayout>
  );
};

export default BrandDataPage;
