import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { timeOutline, personOutline, mapOutline } from 'ionicons/icons';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, deliveryPartnerClient, type PartnerCoverageItem } from '../../services/deliveryPartnerClient';
import { isWithinFleetHours, parseFleetClock } from './fleetHours';

const EMPTY = { supervisor: '', supervisorPhone: '', ordersPhone: '', startTime: '', endTime: '', yapePlin: '', nameYapePlin: '' };

export function PartnerAccountSummary({ startTime, endTime, supervisor, cities, onEdit }: {
  startTime: string; endTime: string; supervisor: string; cities: string[]; onEdit: () => void;
}) {
  const { t } = useTranslation();
  const start = parseFleetClock(startTime);
  const end = parseFleetClock(endTime);
  const hasWindow = start != null && end != null && start !== end;
  return <div className="partner-account-summary">
    <button type="button" className="partner-account-hours" onClick={onEdit}>
      <IonIcon icon={timeOutline} aria-hidden="true" /><span><span>{t('motorized.hours')}</span><strong>{startTime && endTime ? `${startTime} – ${endTime}` : t('motorized.noHours')}</strong>
      {hasWindow ? <small>{t(isWithinFleetHours(startTime, endTime) ? 'motorized.presenceOnShift' : 'motorized.presenceOffHours')}</small> : null}</span>
    </button>
    <dl className="partner-account-facts">
      <div><dt><IonIcon icon={personOutline} aria-hidden="true" />{t('motorized.supervisor')}</dt><dd>{supervisor.trim() || '—'}</dd></div>
      <div><dt><IonIcon icon={mapOutline} aria-hidden="true" />{t('motorized.cities')}</dt><dd>{cities.length ? cities.join(', ') : '—'}</dd></div>
    </dl>
    <button type="button" className="ag-btn ag-btn--primary" onClick={onEdit}>{t('motorized.edit')}</button>
  </div>;
}

export default function PartnerAccountPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [coverage, setCoverage] = useState<PartnerCoverageItem[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setReady(false); setLoadFailed(false); setError('');
    void (async () => {
      try {
        const partner = await deliveryPartnerClient.getMe();
        if (!active) return;
        if (!partner) {
          setLoadFailed(true);
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
        if (!active) return;
        setLoadFailed(true);
        setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
        setReady(true);
      }
    })();
    return () => { active = false; };
  }, [t, retry]);

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

  const cities = coverage.flatMap((item) => item.cityCodes).filter(Boolean);

  return (
    <StackLayout title={t('motorized.account')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen fleet-list partner-account-page">
      {!ready ? <p role="status">{t('ops.filters.loadingMessages')}</p> : loadFailed ? (
        <div className="partner-account-feedback" role="alert"><p>{error}</p><button type="button" className="ag-btn" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button></div>
      ) : editing ? (
        <form className="staff-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <button type="button" className="fleet-row" disabled={saving} onClick={() => setEditing(false)}>{t('common.back')}</button>
          <label>{t('motorized.supervisor')}<input value={form.supervisor} onChange={(event) => setForm({ ...form, supervisor: event.target.value })} /></label>
          <label>{t('motorized.supervisorPhone')}<input type="tel" value={form.supervisorPhone} onChange={(event) => setForm({ ...form, supervisorPhone: event.target.value })} /></label>
          <label>{t('motorized.ordersPhone')}<input type="tel" value={form.ordersPhone} onChange={(event) => setForm({ ...form, ordersPhone: event.target.value })} /></label>
          <label>{t('motorized.startTime')}<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label>{t('motorized.endTime')}<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          <label>{t('motorized.yape')}<input type="tel" value={form.yapePlin} onChange={(event) => setForm({ ...form, yapePlin: event.target.value })} /></label>
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
        <PartnerAccountSummary startTime={form.startTime} endTime={form.endTime} supervisor={form.supervisor} cities={cities} onEdit={() => setEditing(true)} />
      )}
      {error && !loadFailed ? <p role="alert">{error}</p> : null}
    </StackLayout>
  );
}
