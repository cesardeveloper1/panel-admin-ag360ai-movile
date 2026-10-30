import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chatbubblesOutline, chevronForwardOutline } from 'ionicons/icons';
import { StackLayout } from '../../components/layouts';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage, deliveryPartnerClient, type PartnerNotificationGroup } from '../../services/deliveryPartnerClient';

export function PartnerGroupCard({ group, onOpen }: { group: PartnerNotificationGroup; onOpen: () => void }) {
  const { t } = useTranslation();
  return <button type="button" className="partner-group-card" onClick={onOpen}>
    <span className="partner-group-icon" aria-hidden="true"><IonIcon icon={chatbubblesOutline} /></span>
    <span className="partner-group-copy"><strong>{group.label?.trim() || t('motorized.groupFallback')}</strong>
      <span className={group.isActive === false ? 'partner-group-state' : 'partner-group-state partner-group-state--active'}>{t(group.isActive === false ? 'motorized.groupInactive' : 'motorized.groupActive')}</span>
      <span>{group.branchIds.length === 0 ? t('motorized.allBranches') : t('motorized.branchCount', { count: group.branchIds.length })}</span>
    </span><IonIcon icon={chevronForwardOutline} aria-hidden="true" />
  </button>;
}

export default function PartnerGroupsPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<PartnerNotificationGroup[] | null>(null);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setError(''); setLoadFailed(false); setGroups(null);
    void (async () => {
      try {
        const partner = await deliveryPartnerClient.getMe();
        const nextBranches = await deliveryPartnerClient.getBranches();
        if (!active) return;
        setGroups(partner?.notificationGroups ?? []);
        setBranches(nextBranches);
      } catch (cause) {
        if (!active) return;
        setLoadFailed(true);
        setGroups([]);
        setError(apiErrorMessage(cause, t('ops.reliability.unavailable')));
      }
    })();
    return () => { active = false; };
  }, [t, retry]);

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
    <StackLayout title={t('motorized.groups')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack staff-screen fleet-list partner-groups-page">
      {groups === null ? <p role="status">{t('ops.filters.loadingMessages')}</p> : editing !== null && groups[editing] ? (
        <form className="staff-form" onSubmit={(event) => event.preventDefault()}>
          <button type="button" className="fleet-row" disabled={saving} onClick={() => setEditing(null)}>{t('common.back')}</button>
          <label>{t('motorized.groupId')}<input autoCapitalize="none" autoCorrect="off" spellCheck={false} value={groups[editing].wspGroupId} onChange={(event) => update(editing, { wspGroupId: event.target.value })} /></label>
          <label>{t('motorized.groupLabel')}<input value={groups[editing].label ?? ''} onChange={(event) => update(editing, { label: event.target.value })} /></label>
          <label className="fleet-check">
            <input type="checkbox" checked={groups[editing].isActive !== false} onChange={(event) => update(editing, { isActive: event.target.checked })} />
            {t('motorized.groupActive')}
          </label>
          <p className="partner-group-scope-hint">{t('motorized.groupScopeHint')}</p>
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
          {!loadFailed && groups.length === 0 ? <div className="partner-group-feedback" role="status"><IonIcon icon={chatbubblesOutline} aria-hidden="true" /><p>{t('motorized.empty')}</p></div> : groups.map((group, index) => <PartnerGroupCard key={`${group.wspGroupId}-${index}`} group={group} onOpen={() => setEditing(index)} />)}
          <button type="button" className="ag-btn ag-btn--primary" disabled={loadFailed} onClick={() => {
            setGroups((current) => [...(current ?? []), { wspGroupId: '', label: '', branchIds: [], isActive: true }]);
            setEditing(groups.length);
          }}>{t('motorized.addGroup')}</button>
        </>
      )}
      {error ? <div className="partner-group-feedback" role="alert"><p>{error}</p>{loadFailed ? <button type="button" className="ag-btn" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button> : null}</div> : null}
    </StackLayout>
  );
}
