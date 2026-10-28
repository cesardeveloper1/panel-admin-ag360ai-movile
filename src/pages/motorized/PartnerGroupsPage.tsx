import { useEffect, useState } from 'react';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, deliveryPartnerClient, type PartnerNotificationGroup } from '../../services/deliveryPartnerClient';

export default function PartnerGroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<PartnerNotificationGroup[] | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
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
    <StackLayout title={t('motorized.groups')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen">
      {groups === null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : groups.map((group, index) => (
        <form key={`${group.wspGroupId}-${index}`} className="staff-form" onSubmit={(event) => event.preventDefault()}>
          <label>{t('motorized.groupId')}<input value={group.wspGroupId} onChange={(event) => update(index, { wspGroupId: event.target.value })} /></label>
          <label>{t('motorized.groupLabel')}<input value={group.label ?? ''} onChange={(event) => update(index, { label: event.target.value })} /></label>
          <label><input type="checkbox" checked={group.isActive !== false} onChange={(event) => update(index, { isActive: event.target.checked })} /> {t('motorized.groupActive')}</label>
          {branches.map((branch) => (
            <label key={branch.id}>
              <input
                type="checkbox"
                checked={group.branchIds.includes(branch.id)}
                onChange={(event) => update(index, {
                  branchIds: event.target.checked ? [...group.branchIds, branch.id] : group.branchIds.filter((id) => id !== branch.id),
                })}
              />
              {branch.name}
            </label>
          ))}
        </form>
      ))}
      <button type="button" className="ag-btn" onClick={() => setGroups((current) => [...(current ?? []), { wspGroupId: '', label: '', branchIds: [], isActive: true }])}>{t('motorized.addGroup')}</button>
      <button type="button" className="ag-btn" disabled={saving || groups === null} onClick={() => void save()}>{t('staff.save')}</button>
      {error ? <p role="alert">{error}</p> : null}
    </StackLayout>
  );
}
