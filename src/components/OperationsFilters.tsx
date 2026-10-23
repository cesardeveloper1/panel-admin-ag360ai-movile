import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { toLocalIsoDate, type OrdersListFilters, type OrdersDateMode } from '../services/ordersQuery';
import { getOperationsContext, type OperationsContext } from '../services/operationsContextService';

export interface OperationsScopeResult { scope: string; data: OperationsContext | null; state: 'loading' | 'ready' | 'error' }
export type OperationsPanel = 'local' | 'channel' | 'date';
export type FunnelChannel = 'all' | 'whatsapp' | 'instagram' | 'messenger';
const modes: OrdersDateMode[] = ['all', 'today', 'last12Hours', 'day', 'range'];
const conversationChannels: FunnelChannel[] = ['all', 'whatsapp', 'instagram', 'messenger'];

export function OperationsFilters({ panel, mode, onScopeChange, funnelChannel = 'all', onFunnelChannel }: {
  panel: OperationsPanel | null;
  onClose: () => void;
  mode: 'orders' | 'funnel';
  onScopeChange?: (result: OperationsScopeResult) => void;
  funnelChannel?: FunnelChannel;
  onFunnelChannel?: (channel: FunnelChannel) => void;
}) {
  const { t } = useTranslation();
  const channelName = useId();
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
  useEffect(() => { setDraft({ ...ordersFilters }); }, [ordersFilters]);
  const current = context?.scope === scope ? context.data : null;
  const branches = current?.branches ?? [];
  const showDate = panel === 'date' && mode === 'orders';
  const commit = (patch: Partial<OrdersListFilters>) => {
    if (!current) return;
    const next = { ...patch };
    if (branches.length === 1) next.branchId = branches[0].id;
    if (next.branchId && !branches.some(branch => branch.id === next.branchId)) return;
    void setOrdersFilters(next);
  };
  const selectDate = (value: OrdersDateMode) => {
    if (!current) return;
    const today = toLocalIsoDate(new Date(), brand?.timezone);
    const next: Partial<OrdersListFilters> = {
      dateMode: value,
      dateFrom: value === 'today' || value === 'day' ? today : value === 'range' ? draft.dateFrom : undefined,
      dateTo: value === 'today' || value === 'day' ? today : value === 'range' ? draft.dateTo : undefined,
    };
    setDraft(previous => ({ ...previous, ...next }));
    if ((value === 'day' && !next.dateFrom) || (value === 'range' && (!next.dateFrom || !next.dateTo))) return;
    commit(next);
  };
  if (!panel || (panel === 'date' && mode !== 'orders')) return null;
  const title = panel === 'local' ? t('ops.filters.local') : panel === 'date' ? t('ops.filters.date') : t('ops.filters.channel');
  const status = state === 'loading' ? <p role="status">{t('ops.filters.loading')}</p> : state === 'error' ? (
    <div role="alert"><p>{t('ops.filters.contextError')}</p><button className="ag-btn" type="button" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button></div>
  ) : null;
  return <div className="ops-filter-popover" role="dialog" aria-label={title}>
    <div className="ops-filter-popover__bar"><h3>{title}</h3></div>
    <div className="ops-filters-fields">
      {panel === 'local' ? <fieldset aria-label={title}>
        {status ?? (branches.length === 0 ? <p>{t('ops.filters.noLocals')}</p> : branches.length === 1 ? <p>{branches[0].name}</p> :
          <select aria-label={t('ops.filters.local')} value={draft.branchId ?? ''} onChange={event => commit({ branchId: event.target.value || undefined })}>
            <option value="">{t('ops.filters.allLocals')}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>)}
      </fieldset> : null}
      {showDate ? <fieldset aria-label={title}>
        {status ?? <><div className="ops-date-options">{modes.map(value =>
          <button key={value} className="ag-btn" type="button" aria-pressed={draft.dateMode === value} onClick={() => selectDate(value)}>{t(`ops.filters.${value}`)}</button>)}</div>
          {['day', 'range'].includes(draft.dateMode) ? <div className="ops-date-inputs">
            <label>{t('ops.filters.from')}<input type="date" value={draft.dateFrom ?? ''} onChange={event => { const dateFrom = event.target.value; setDraft(previous => ({ ...previous, dateFrom })); if (dateFrom && (draft.dateMode !== 'range' || draft.dateTo)) commit({ dateMode: draft.dateMode, dateFrom, dateTo: draft.dateMode === 'day' ? dateFrom : draft.dateTo }); }} /></label>
            {draft.dateMode === 'range' ? <label>{t('ops.filters.to')}<input type="date" value={draft.dateTo ?? ''} onChange={event => { const dateTo = event.target.value; setDraft(previous => ({ ...previous, dateTo })); if (draft.dateFrom && dateTo) commit({ dateMode: 'range', dateFrom: draft.dateFrom, dateTo }); }} /></label> : null}
          </div> : null}</>}
      </fieldset> : null}
      {panel === 'channel' ? <fieldset aria-label={title}>
        {mode === 'orders' ? status ?? <div className="ops-channel-options">{([
          ['', t('ops.filters.allChannels')], ['1', 'WhatsApp'], ['2', t('ops.filters.digitalMenu')], ['5', 'Instagram'], ['6', 'Messenger'],
        ] as const).map(([value, label]) => <label key={value || 'all'}><input type="radio" name={channelName} checked={(draft.source ? String(draft.source) : '') === value} onChange={() => commit({ source: value ? Number(value) as OrdersListFilters['source'] : undefined })} />{label}</label>)}</div>
          : <div className="ops-channel-options">{conversationChannels.map(value =>
          <label key={value}><input type="radio" name={channelName} checked={funnelChannel === value} onChange={() => onFunnelChannel?.(value)} />{value === 'all' ? t('ops.filters.allChannels') : value === 'whatsapp' ? 'WhatsApp' : value === 'instagram' ? 'Instagram' : 'Messenger'}</label>)}
        </div>}
        {current && current.whatsappAccounts.length > 0 ? <div className="ops-channel-connections"><p>{t('ops.filters.connections')}</p><p>{t('ops.filters.connectionMeaning')}</p>
          {current.whatsappAccounts.map(account => <div className="ops-connection" key={account.id}>
            <strong>{account.identity.phoneNumber || t('ops.filters.numberUnavailable')}</strong>
            <span>{account.coverage === 'shared' ? t('ops.filters.shared') : account.branchIds.map(id => branches.find(branch => branch.id === id)?.name).filter(Boolean).join(', ') || t('ops.filters.local')}</span>
            <span>{account.status}</span>
          </div>)}
        </div> : null}
      </fieldset> : null}
    </div>
  </div>;
}
