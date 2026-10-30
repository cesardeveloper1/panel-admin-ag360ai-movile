import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { mapOutline, chevronForwardOutline } from 'ionicons/icons';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { PartnerZoneMap } from './PartnerZoneMap';
import { apiErrorMessage, deliveryPartnerClient, type PartnerZone, type PartnerZonePoint } from '../../services/deliveryPartnerClient';

const EMPTY = { name: '', deliveryAmount: '0', estimatedDeliveryTime: '30-45 min', startTime: '08:00', endTime: '22:00', allowFreeDelivery: false, color: '#8746ff' };

export function PartnerZoneCard({ zone, onOpen }: { zone: PartnerZone; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  return <button type="button" className="partner-zone-card" onClick={onOpen}>
    <span className="partner-zone-icon" aria-hidden="true"><IonIcon icon={mapOutline} /></span>
    <span className="partner-zone-copy"><strong>{zone.name}</strong>
      {typeof zone.deliveryAmount === 'number' ? <span>{t('motorized.deliveryAmount')}: {zone.deliveryAmount.toLocaleString(i18n.language, { minimumFractionDigits: 2 })}</span> : null}
      {zone.startTime && zone.endTime ? <span>{zone.startTime} – {zone.endTime}</span> : null}
    </span><IonIcon icon={chevronForwardOutline} aria-hidden="true" />
  </button>;
}

export default function PartnerZonesPage() {
  const { t } = useTranslation();
  const [zones, setZones] = useState<PartnerZone[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PartnerZone | null | undefined>(undefined);
  const [points, setPoints] = useState<PartnerZonePoint[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError('');
    setZones(null);
    try {
      setZones(await deliveryPartnerClient.getZones());
    } catch (cause) {
      setZones([]);
      setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
    }
  };

  useEffect(() => { void load(); }, []);

  const open = (zone?: PartnerZone) => {
    setEditing(zone ?? null);
    setPoints(zone?.polygonRoute ?? []);
    setForm({
      name: zone?.name ?? '',
      deliveryAmount: String(zone?.deliveryAmount ?? 0),
      estimatedDeliveryTime: zone?.estimatedDeliveryTime || '30-45 min',
      startTime: zone?.startTime || '08:00',
      endTime: zone?.endTime || '22:00',
      allowFreeDelivery: Boolean(zone?.allowFreeDelivery),
      color: zone?.color || '#8746ff',
    });
    setError('');
  };

  const save = async () => {
    if (!form.name.trim() || points.length < 3) {
      setError(t('motorized.zoneInvalid'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await deliveryPartnerClient.saveZone(editing?._id ?? null, {
        name: form.name.trim(),
        coverageType: 'polygon',
        polygonRoute: points,
        deliveryAmount: Number(form.deliveryAmount) || 0,
        estimatedDeliveryTime: form.estimatedDeliveryTime,
        startTime: form.startTime,
        endTime: form.endTime,
        allowFreeDelivery: form.allowFreeDelivery,
        color: form.color,
      });
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (zone: PartnerZone) => {
    setError('');
    try {
      await deliveryPartnerClient.deleteZone(zone._id);
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
    }
  };

  return (
    <StackLayout title={t('motorized.zones')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen partner-zones-page">
      {editing !== undefined ? (
        <form className="staff-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <button type="button" className="fleet-row" disabled={saving} onClick={() => setEditing(undefined)}>{t('common.back')}</button>
          <label>{t('motorized.zoneName')}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>{t('motorized.deliveryAmount')}<input inputMode="decimal" value={form.deliveryAmount} onChange={(event) => setForm({ ...form, deliveryAmount: event.target.value })} /></label>
          <label>{t('motorized.startTime')}<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label>{t('motorized.endTime')}<input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
          <p>{t('motorized.mapHint')}</p>
          <PartnerZoneMap points={points} color={form.color} onChange={setPoints} />
          <button type="button" className="fleet-row" onClick={() => setPoints((current) => current.slice(0, -1))}>{t('motorized.undoPoint')}</button>
          <button type="submit" className="ag-btn ag-btn--primary" disabled={saving}>{t('staff.save')}</button>
          {editing?._id ? (
            <button type="button" className="fleet-row fleet-row--danger" onClick={() => void remove(editing)}>{t('motorized.delete')}</button>
          ) : null}
        </form>
      ) : zones === null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : (
        <>
          {!error && zones.length === 0 ? <div className="partner-zone-feedback" role="status"><IonIcon icon={mapOutline} aria-hidden="true" /><p>{t('motorized.empty')}</p></div> : zones.map((zone) => <PartnerZoneCard key={zone._id} zone={zone} onOpen={() => open(zone)} />)}
          <button type="button" className="ag-btn ag-btn--primary" onClick={() => open()}>{t('motorized.addZone')}</button>
        </>
      )}
      {error ? <div className="partner-zone-feedback" role="alert"><p>{error}</p>{editing === undefined ? <button type="button" className="ag-btn" onClick={() => void load()}>{t('ops.reliability.retry')}</button> : null}</div> : null}
    </StackLayout>
  );
}
