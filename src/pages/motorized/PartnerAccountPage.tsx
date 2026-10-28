import { useEffect, useState } from 'react';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, deliveryPartnerClient, type PartnerCoverageItem } from '../../services/deliveryPartnerClient';

const EMPTY = { supervisor: '', supervisorPhone: '', ordersPhone: '', startTime: '', endTime: '', yapePlin: '', nameYapePlin: '' };

export default function PartnerAccountPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [coverage, setCoverage] = useState<PartnerCoverageItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const partner = await deliveryPartnerClient.getMe();
        if (!partner) {
          setError(t('motorized.noPartner'));
          setReady(true);
          return;
        }
        setForm({
          supervisor: partner.supervisor ?? '',
          supervisorPhone: partner.supervisorPhone ?? '',
          ordersPhone: partner.ordersPhone ?? '',
          startTime: partner.startTime ?? '',
          endTime: partner.endTime ?? '',
          yapePlin: partner.yapePlin ?? '',
          nameYapePlin: partner.nameYapePlin ?? '',
        });
        setCoverage(partner.coverage ?? []);
        setReady(true);
      } catch (cause) {
        setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
        setReady(true);
      }
    })();
  }, [t]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await deliveryPartnerClient.updateMe({
        ...form,
        coverage: coverage.filter((item) => item.countryCode.trim()),
      });
    } catch (cause) {
      setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StackLayout title={t('motorized.account')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen">
      {!ready ? <p role="status">{t('ops.filters.loadingMessages')}</p> : (
        <form className="staff-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label>{t('motorized.supervisor')}<input value={form.supervisor} onChange={(event) => setForm({ ...form, supervisor: event.target.value })} /></label>
          <label>{t('motorized.supervisorPhone')}<input value={form.supervisorPhone} onChange={(event) => setForm({ ...form, supervisorPhone: event.target.value })} /></label>
          <label>{t('motorized.ordersPhone')}<input value={form.ordersPhone} onChange={(event) => setForm({ ...form, ordersPhone: event.target.value })} /></label>
          <label>{t('motorized.startTime')}<input value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label>{t('motorized.endTime')}<input value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          <label>{t('motorized.yape')}<input value={form.yapePlin} onChange={(event) => setForm({ ...form, yapePlin: event.target.value })} /></label>
          <label>{t('motorized.yapeName')}<input value={form.nameYapePlin} onChange={(event) => setForm({ ...form, nameYapePlin: event.target.value })} /></label>
          <p>{t('motorized.coverage')}</p>
          {coverage.map((item, index) => (
            <label key={index}>
              {t('motorized.country')}
              <input value={item.countryCode} onChange={(event) => setCoverage(coverage.map((row, rowIndex) => rowIndex === index ? { ...row, countryCode: event.target.value } : row))} />
              {t('motorized.cities')}
              <input value={item.cityCodes.join(', ')} onChange={(event) => setCoverage(coverage.map((row, rowIndex) => rowIndex === index ? { ...row, cityCodes: event.target.value.split(',').map((city) => city.trim()).filter(Boolean) } : row))} />
            </label>
          ))}
          <button type="button" className="ag-btn" onClick={() => setCoverage([...coverage, { countryCode: '', cityCodes: [] }])}>{t('motorized.addCoverage')}</button>
          <button type="submit" className="ag-btn" disabled={saving}>{t('staff.save')}</button>
        </form>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </StackLayout>
  );
}
