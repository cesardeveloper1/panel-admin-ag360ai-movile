import { useEffect, useState } from 'react';
import { IonContent, IonFooter, IonHeader, IonModal, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { defaultOrdersFilters, toLocalIsoDate, type OrdersListFilters, type OrdersDateMode } from '../services/ordersQuery';
import { getOperationsContext, type OperationsContext } from '../services/operationsContextService';

export interface OperationsScopeResult { scope: string; data: OperationsContext | null; state: 'loading' | 'ready' | 'error' }
const modes: OrdersDateMode[] = ['all', 'today', 'last12Hours', 'day', 'range'];
export function OperationsFilters({ open, onClose, mode, onScopeChange }: {
  open: boolean; onClose: () => void; mode: 'orders' | 'funnel'; onScopeChange?: (result: OperationsScopeResult) => void;
}) {
  const { t } = useTranslation();
  const { brand, authEpoch, ordersFilters, setOrdersFilters } = useApp();
  const [draft, setDraft] = useState<OrdersListFilters>(ordersFilters);
  const [context, setContext] = useState<{ scope: string; data: OperationsContext } | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const scope = `${authEpoch}|${brand?.id}|${brand?.subdomain}`;
  useEffect(() => {
    let active = true;
    setContext(null);
    setState('loading');
    onScopeChange?.({ scope, data: null, state: 'loading' });
    if (!brand?.subdomain) return;
    void getOperationsContext(brand.subdomain).then(data => {
      if (!active) return;
      if (data.brandId !== brand.id) throw new Error('Context brand mismatch');
      setContext({ scope, data }); setState('ready');
      onScopeChange?.({ scope, data, state: 'ready' });
    }).catch(() => { if (active) { setState('error'); onScopeChange?.({ scope, data: null, state: 'error' }); } });
    return () => { active = false; };
  }, [scope, brand?.subdomain, brand?.id, retry, onScopeChange]);
  useEffect(() => { if (open) setDraft({ ...ordersFilters }); }, [open, ordersFilters]);
  const current = context?.scope === scope ? context.data : null;
  const branches = current?.branches ?? [];
  const allowedBranch = !draft.branchId || branches.some(branch => branch.id === draft.branchId);
  const validDates = !['day', 'range'].includes(draft.dateMode) || Boolean(draft.dateFrom && (draft.dateMode !== 'range' || draft.dateTo));
  const apply = () => {
    if (!current || !allowedBranch || !validDates) return;
    const today = toLocalIsoDate(new Date(), brand?.timezone);
    const next = { ...draft, branchId: branches.length === 1 ? branches[0].id : draft.branchId,
      dateFrom: draft.dateMode === 'today' ? today : draft.dateFrom,
      dateTo: draft.dateMode === 'today' ? today : draft.dateMode === 'day' ? draft.dateFrom : draft.dateTo };
    void setOrdersFilters(next);
    onClose();
  };
  return <IonModal isOpen={open} onDidDismiss={onClose} className="ops-filters-modal" aria-label={t('ops.filters.title')}>
    <IonHeader><IonToolbar><div className="ops-filters-heading"><h2>{t('ops.filters.title')}</h2>
      <button type="button" className="ag-btn" onClick={onClose}>{t('ops.filters.cancel')}</button></div></IonToolbar></IonHeader>
    <IonContent className="ops-filters-content"><div className="ops-filters-fields">
      <fieldset><legend>{t('ops.filters.local')}</legend>
        {state === 'loading' ? <p role="status">{t('ops.filters.loading')}</p> : state === 'error' ?
          <div role="alert"><p>{t('ops.filters.contextError')}</p><button className="ag-btn" type="button" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button></div> :
          branches.length === 0 ? <p>{t('ops.filters.noLocals')}</p> : branches.length === 1 ? <p>{branches[0].name}</p> :
          <select aria-label={t('ops.filters.local')} value={draft.branchId ?? ''} onChange={event => setDraft({ ...draft, branchId: event.target.value || undefined })}>
            <option value="">{t('ops.filters.allLocals')}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>}
      </fieldset>
      {mode === 'orders' ? <>
        <fieldset><legend>{t('ops.filters.date')}</legend><div className="ops-date-options">{modes.map(value =>
          <button key={value} className="ag-btn" type="button" aria-pressed={draft.dateMode === value} onClick={() => setDraft({ ...draft, dateMode: value })}>{t(`ops.filters.${value}`)}</button>)}</div>
          {['day', 'range'].includes(draft.dateMode) ? <div className="ops-date-inputs">
            <label>{t('ops.filters.from')}<input type="date" value={draft.dateFrom ?? ''} onChange={event => setDraft({ ...draft, dateFrom: event.target.value })} /></label>
            {draft.dateMode === 'range' ? <label>{t('ops.filters.to')}<input type="date" value={draft.dateTo ?? ''} onChange={event => setDraft({ ...draft, dateTo: event.target.value })} /></label> : null}
          </div> : null}
        </fieldset>
        <fieldset><legend>{t('ops.filters.channel')}</legend><select aria-label={t('ops.filters.channel')} value={draft.source ?? ''} onChange={event => setDraft({ ...draft, source: event.target.value ? Number(event.target.value) as OrdersListFilters['source'] : undefined })}>
          <option value="">{t('ops.filters.allChannels')}</option><option value="1">WhatsApp</option><option value="2">{t('ops.filters.digitalMenu')}</option><option value="5">Instagram</option><option value="6">Messenger</option>
        </select></fieldset>
      </> : null}
      {current && current.whatsappAccounts.length > 0 ? <fieldset><legend>{t('ops.filters.connections')}</legend>
        <p>{t('ops.filters.connectionMeaning')}</p>{current.whatsappAccounts.map(account => <div className="ops-connection" key={account.id}>
          <strong>{account.identity.phoneNumber || t('ops.filters.numberUnavailable')}</strong>
          <span>{account.coverage === 'shared' ? t('ops.filters.shared') : account.branchIds.map(id => branches.find(branch => branch.id === id)?.name).filter(Boolean).join(', ') || t('ops.filters.local')}</span>
          <span>{account.status}</span>
        </div>)}
      </fieldset> : null}
    </div></IonContent>
    <IonFooter><div className="ops-filters-footer"><button type="button" className="ag-btn" onClick={() => setDraft({ ...defaultOrdersFilters(), dateMode: 'all', search: ordersFilters.search })}>{t('ops.filters.clear')}</button>
      <button type="button" className="ag-btn ag-btn--primary" disabled={!current || !allowedBranch || !validDates} onClick={apply}>{t('ops.dateApply')}</button></div></IonFooter>
  </IonModal>;
}
