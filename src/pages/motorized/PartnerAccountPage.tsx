import { useEffect, useState } from 'react';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, deliveryPartnerClient, type PartnerCoverageItem } from '../../services/deliveryPartnerClient';
import { isWithinFleetHours, parseFleetClock } from './fleetHours';

const EMPTY = { supervisor: '', supervisorPhone: '', ordersPhone: '', startTime: '', endTime: '', yapePlin: '', nameYapePlin: '' };

export default function PartnerAccountPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [coverage, setCoverage] = useState<PartnerCoverageItem[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
    } finally {
      setSaving(false);
    }
  };

  const start = parseFleetClock(form.startTime);
  const end = parseFleetClock(form.endTime);
  const hasWindow = start != null && end != null && start !== end;
  const cities = coverage.flatMap((item) => item.cityCodes).filter(Boolean);

  return (
    <StackLayout title={t('motorized.account')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen fleet-list">
      {!ready ? <p role="status">{t('ops.filters.loadingMessages')}</p> : editing ? (
        <form className="staff-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <button type="button" className="fleet-row" onClick={() => setEditing(false)}>{t('common.back')}</button>
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
          <button type="button" className="fleet-row" onClick={() => setCoverage([...coverage, { countryCode: '', cityCodes: [] }])}>{t('motorized.addCoverage')}</button>
          <button type="submit" className="ag-btn ag-btn--primary" disabled={saving}>{t('staff.save')}</button>
        </form>
      ) : (
        <>
          <button type="button" className="fleet-row" onClick={() => setEditing(true)}>
            <span>{t('motorized.hours')}</span>
            <strong>{form.startTime && form.endTime ? `${form.startTime} – ${form.endTime}` : t('motorized.noHours')}</strong>
          </button>
          {hasWindow ? (
            <article className="fleet-row fleet-row--static">
              <strong>{isWithinFleetHours(form.startTime, form.endTime) ? t('motorized.presenceOnShift') : t('motorized.presenceOffHours')}</strong>
            </article>
          ) : null}
          <article className="fleet-row fleet-row--static">
            <span>{t('motorized.supervisor')}</span>
            <strong>{form.supervisor.trim() || t('motorized.empty')}</strong>
          </article>
          <article className="fleet-row fleet-row--static">
            <span>{t('motorized.cities')}</span>
            <strong>{cities.length > 0 ? cities.join(', ') : t('motorized.empty')}</strong>
          </article>
          <button type="button" className="ag-btn ag-btn--primary" onClick={() => setEditing(true)}>{t('motorized.edit')}</button>
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </StackLayout>
  );
}
