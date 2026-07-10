import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { colorPaletteOutline, linkOutline, saveOutline, imageOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppShell } from '../components/AppShell';
import { useApp } from '../context/AppContext';
import { useModuleNav } from '../hooks/useModuleNav';
import { apiMock } from '../services/apiMock';
import type { BrandConfig } from '../types';
import { LOGO_COLOR_LOCAL, LOGO_WHITE_LOCAL } from '../constants/assets';

function normalizeHex(value: string, fallback: string) {
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase();
  return fallback;
}

const BrandDataPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, showToast } = useApp();
  const { breadcrumbs, onBack } = useModuleNav();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BrandConfig | null>(null);

  useEffect(() => {
    if (!brand) return;
    setLoading(true);
    void apiMock.getBrandConfig(brand.id).then((data) => {
      setForm(data);
      setLoading(false);
    });
  }, [brand]);

  const previewPrimary = form?.primaryColor ?? '#8746FF';
  const previewSecondary = form?.secondaryColor ?? '#141A32';

  const subtitle = useMemo(
    () => (brand ? `${t(brand.nameKey)} · ${t('brandData.subtitle')}` : ''),
    [brand, t],
  );

  const patch = (partial: Partial<BrandConfig>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const onSave = async () => {
    if (!form || !brand || saving) return;
    setSaving(true);
    try {
      const payload: BrandConfig = {
        ...form,
        brandId: brand.id,
        primaryColor: normalizeHex(form.primaryColor, '#8746FF'),
        secondaryColor: normalizeHex(form.secondaryColor, '#141A32'),
      };
      await apiMock.saveBrandConfig(payload);
      setForm(payload);
      showToast('toast.brandSaved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ag-screen">
        <AppShell>
        <AppHeader showAlerts title={t('brandData.title')} subtitle={subtitle} avatar={brand?.initials} onBack={onBack} breadcrumbs={breadcrumbs} />
        <div className="ag-body brand-data-body">
          {loading || !form ? (
            <div className="module-loading">
              <IonSpinner name="crescent" />
            </div>
          ) : (
            <>
              <section className="brand-section">
                <div className="brand-section__head">
                  <h2>{t('brandData.logo')}</h2>
                  <IonIcon icon={imageOutline} />
                </div>
                <div className="brand-logo-box">
                  <img src={form.logoUrl || LOGO_COLOR_LOCAL} alt={t('brandData.logo')} />
                </div>
                <button type="button" className="ag-btn ag-btn--ghost brand-upload-btn" onClick={() => showToast('toast.comingSoon')}>
                  {t('brandData.uploadLogo')}
                </button>
                <p className="brand-hint">{t('brandData.logoHint')}</p>
              </section>

              <section className="brand-section">
                <div className="brand-section__head">
                  <h2>{t('brandData.colors')}</h2>
                  <IonIcon icon={colorPaletteOutline} />
                </div>
                <div className="brand-color-grid">
                  <label className="brand-field">
                    <span>{t('brandData.primaryColor')}</span>
                    <div className="brand-color-input">
                      <span className="brand-color-swatch" style={{ background: previewPrimary }} />
                      <input
                        value={form.primaryColor}
                        onChange={(e) => patch({ primaryColor: e.target.value })}
                        aria-label={t('brandData.primaryColor')}
                      />
                    </div>
                  </label>
                  <label className="brand-field">
                    <span>{t('brandData.secondaryColor')}</span>
                    <div className="brand-color-input">
                      <span className="brand-color-swatch" style={{ background: previewSecondary }} />
                      <input
                        value={form.secondaryColor}
                        onChange={(e) => patch({ secondaryColor: e.target.value })}
                        aria-label={t('brandData.secondaryColor')}
                      />
                    </div>
                  </label>
                </div>
              </section>

              <section className="brand-section">
                <div className="brand-section__head">
                  <h2>{t('brandData.social')}</h2>
                  <IonIcon icon={linkOutline} />
                </div>
                <label className="brand-field brand-field--full">
                  <span>Instagram</span>
                  <div className="brand-input-wrap">
                    <span className="brand-input-prefix">@</span>
                    <input
                      value={form.instagram}
                      onChange={(e) => patch({ instagram: e.target.value })}
                      placeholder={t('brandData.instagramPh')}
                    />
                  </div>
                </label>
                <label className="brand-field brand-field--full">
                  <span>Facebook</span>
                  <input
                    className="brand-input"
                    value={form.facebook}
                    onChange={(e) => patch({ facebook: e.target.value })}
                    placeholder={t('brandData.facebookPh')}
                  />
                </label>
                <label className="brand-field brand-field--full">
                  <span>WhatsApp</span>
                  <input
                    className="brand-input"
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => patch({ whatsapp: e.target.value })}
                    placeholder={t('brandData.whatsappPh')}
                  />
                </label>
              </section>

              <section className="brand-section brand-section--preview">
                <h2>{t('brandData.preview')}</h2>
                <div className="brand-preview-frame">
                  <div className="brand-preview-phone">
                    <div className="brand-preview-phone__header" style={{ background: previewPrimary }}>
                      <img src={LOGO_WHITE_LOCAL} alt="" className="brand-preview-phone__logo" />
                    </div>
                    <div className="brand-preview-phone__body" style={{ color: previewSecondary }}>
                      <div className="brand-preview-phone__hero" />
                      <div className="brand-preview-phone__line brand-preview-phone__line--lg" />
                      <div className="brand-preview-phone__line brand-preview-phone__line--sm" />
                      <button type="button" className="brand-preview-phone__cta" style={{ background: previewPrimary }}>
                        {t('brandData.previewCta')}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <button type="button" className="brand-save-btn" disabled={saving} onClick={() => void onSave()}>
                <IonIcon icon={saveOutline} />
                {saving ? t('brandData.saving') : t('brandData.save')}
              </button>
            </>
          )}
        </div>
        </AppShell>
      </IonContent>
    </IonPage>
  );
};

export default BrandDataPage;
