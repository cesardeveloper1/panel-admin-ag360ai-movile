import { useEffect, useState } from 'react';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, deliveryPartnerClient, type PartnerNotificationGroup } from '../../services/deliveryPartnerClient';

export default function PartnerGroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<PartnerNotificationGroup[] | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const partner = await deliveryPartnerClient.getMe();
        setGroups(partner?.notificationGroups ?? []);
        setBranches(await deliveryPartnerClient.getBranches());
      } catch (cause) {
        setGroups([]);
        setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
      }
    })();
  }, [t]);

  const save = async () => {
    const filled = (groups ?? []).filter((group) => group.wspGroupId.trim());
    const active = filled.filter((group) => group.isActive !== false);
    const catchAll = active.filter((group) => group.branchIds.length === 0);
    const seen = new Set<string>();
    const duplicate = active.some((group) => group.branchIds.some((id) => {
      if (seen.has(id)) return true;
      seen.add(id);
      return false;
    }));
    if (filled.some((group) => !group.wspGroupId.includes('@g.us')) || catchAll.length > 1 || (catchAll.length === 1 && active.length > 1) || duplicate) {
      setError(t('motorized.groupsInvalid'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await deliveryPartnerClient.updateMe({ notificationGroups: filled });
      setGroups(filled);
      setEditing(null);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
    } finally {
      setSaving(false);
    }
  };

  const update = (index: number, patch: Partial<PartnerNotificationGroup>) => {
    setGroups((current) => (current ?? []).map((group, item) => item === index ? { ...group, ...patch } : group));
  };

  return (
    <StackLayout title={t('motorized.groups')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen fleet-list">
      {groups === null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : editing !== null && groups[editing] ? (
        <form className="staff-form" onSubmit={(event) => event.preventDefault()}>
          <button type="button" className="fleet-row" onClick={() => setEditing(null)}>{t('common.back')}</button>
          <label>{t('motorized.groupId')}<input value={groups[editing].wspGroupId} onChange={(event) => update(editing, { wspGroupId: event.target.value })} /></label>
          <label>{t('motorized.groupLabel')}<input value={groups[editing].label ?? ''} onChange={(event) => update(editing, { label: event.target.value })} /></label>
          <label className="fleet-check">
            <input type="checkbox" checked={groups[editing].isActive !== false} onChange={(event) => update(editing, { isActive: event.target.checked })} />
            {t('motorized.groupActive')}
          </label>
          {branches.map((branch) => (
            <label key={branch.id} className="fleet-check">
              <input
                type="checkbox"
                checked={groups[editing].branchIds.includes(branch.id)}
                onChange={(event) => update(editing, {
                  branchIds: event.target.checked
                    ? [...groups[editing].branchIds, branch.id]
                    : groups[editing].branchIds.filter((id) => id !== branch.id),
                })}
              />
              {branch.name}
            </label>
          ))}
          <button type="button" className="ag-btn ag-btn--primary" disabled={saving} onClick={() => void save()}>{t('staff.save')}</button>
        </form>
      ) : (
        <>
          {groups.length === 0 ? <p>{t('motorized.empty')}</p> : groups.map((group, index) => (
            <button key={`${group.wspGroupId}-${index}`} type="button" className="fleet-row" onClick={() => setEditing(index)}>
              <strong>{group.label?.trim() || t('motorized.groupFallback')}</strong>
              <span>{group.isActive === false ? t('motorized.groupInactive') : t('motorized.groupActive')} · {t('motorized.branchCount', { count: group.branchIds.length })}</span>
            </button>
          ))}
          <button type="button" className="ag-btn ag-btn--primary" onClick={() => {
            setGroups((current) => [...(current ?? []), { wspGroupId: '', label: '', branchIds: [], isActive: true }]);
            setEditing(groups.length);
          }}>{t('motorized.addGroup')}</button>
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </StackLayout>
  );
}
