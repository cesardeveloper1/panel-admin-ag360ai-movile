import { useEffect, useState } from 'react';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { PartnerZoneMap } from './PartnerZoneMap';
import { apiErrorMessage, deliveryPartnerClient, type PartnerZone, type PartnerZonePoint } from '../../services/deliveryPartnerClient';

const EMPTY = { name: '', deliveryAmount: '0', estimatedDeliveryTime: '30-45 min', startTime: '08:00', endTime: '22:00', allowFreeDelivery: false, color: '#8746ff' };

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
    <StackLayout title={t('motorized.zones')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen">
      {editing !== undefined ? (
        <form className="staff-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <button type="button" className="fleet-row" onClick={() => setEditing(undefined)}>{t('common.back')}</button>
          <label>{t('motorized.zoneName')}<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>{t('motorized.deliveryAmount')}<input inputMode="decimal" value={form.deliveryAmount} onChange={(event) => setForm({ ...form, deliveryAmount: event.target.value })} /></label>
          <label>{t('motorized.startTime')}<input value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
          <label>{t('motorized.endTime')}<input value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
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
          {zones.length === 0 ? <p>{t('motorized.empty')}</p> : zones.map((zone) => (
            <button key={zone._id} type="button" className="fleet-row" onClick={() => open(zone)}>
              <strong>{zone.name}</strong>
            </button>
          ))}
          <button type="button" className="ag-btn ag-btn--primary" onClick={() => open()}>{t('motorized.addZone')}</button>
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </StackLayout>
  );
}
