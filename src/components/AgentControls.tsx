import { useEffect, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { botService } from '../services/botService';
import { getOperationsContext, type OperationsContext } from '../services/operationsContextService';
import { ChannelIcon, channelLabel } from './ChannelIcon';

type ChannelName = 'whatsapp' | 'instagram' | 'messenger';
const channels: ChannelName[] = ['whatsapp', 'instagram', 'messenger'];

type Scope = Awaited<ReturnType<typeof botService.getAssistantScope>>;
type Policy = Awaited<ReturnType<typeof botService.getPolicy>>;
type ScopeAccount = Scope['accounts'][number];

function placeOf(shared: boolean, branchName: string | null, fallback: string, sharedLabel: string, localLabel: string) {
  if (shared) return sharedLabel;
  return branchName?.trim() || fallback || localLabel;
}

export function AgentControls() {
  const { t } = useTranslation();
  const { session, brand, agentEnabled, agentLocked, agentBusy, toggleAgent, showToast } = useApp();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [context, setContext] = useState<OperationsContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const subdomain = brand?.subdomain?.trim() || '';
  const canSee = Boolean(session && ['owner', 'superadmin'].includes(session.role) && subdomain);

  useEffect(() => {
    if (!canSee) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    void Promise.all([
      botService.getPolicy(subdomain),
      botService.getAssistantScope(subdomain),
      getOperationsContext(subdomain).catch(() => null),
    ]).then(([nextPolicy, nextScope, nextContext]) => {
      if (!active) return;
      setPolicy(nextPolicy);
      setScope(nextScope);
      setContext(nextContext);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setFailed(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [canSee, subdomain]);

  if (!canSee) return null;

  const brandLocked = agentLocked || agentBusy || failed || loading || scope?.globalCanToggle === false || pending === 'brand';
  const channelsLocked = brandLocked || !agentEnabled;
  const scopeName = scope?.mode === 'per_branch' ? t('agent.wholeBrand') : t('agent.shared');
  const scopeAccounts = scope?.mode === 'per_branch' ? scope.accounts : [];

  const setChannel = async (channel: ChannelName, isOn: boolean) => {
    if (!policy || channelsLocked) return;
    const previous = policy.channels[channel].isOn;
    setPolicy({ ...policy, channels: { ...policy.channels, [channel]: { isOn } } });
    setPending(channel);
    try {
      await botService.setChannel(subdomain, channel, isOn);
    } catch {
      setPolicy((current) => current
        ? { ...current, channels: { ...current.channels, [channel]: { isOn: previous } } }
        : current);
      showToast('agent.updateError');
    } finally {
      setPending(null);
    }
  };

  const setAccount = async (id: string, isOn: boolean) => {
    if (!scope) return;
    setScope({
      ...scope,
      accounts: scope.accounts.map((account) => account.id === id ? { ...account, isOn } : account),
    });
    setPending(id);
    try {
      await botService.setAccountAssistant(subdomain, id, isOn);
    } catch {
      setScope((current) => current
        ? { ...current, accounts: current.accounts.map((account) => account.id === id ? { ...account, isOn: !isOn } : account) }
        : current);
      showToast('agent.updateAccountError');
    } finally {
      setPending(null);
    }
  };

  const numberRows = () => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; phone?: string; place: string; account?: ScopeAccount }> = [];
    for (const account of context?.whatsappAccounts ?? []) {
      if (account.isActive === false) continue;
      seen.add(account.id);
      const scoped = scopeAccounts.find((item) => item.id === account.id);
      const localNames = account.branchIds
        .map((id) => context?.branches.find((branch) => branch.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      rows.push({
        id: account.id,
        phone: account.identity.phoneNumber,
        place: scoped
          ? placeOf(scoped.shared, scoped.branchName, '', t('agent.shared'), t('agent.local'))
          : placeOf(account.coverage === 'brand', null, localNames, t('agent.shared'), t('agent.local')),
        account: scoped,
      });
    }
    for (const account of scopeAccounts) {
      if (seen.has(account.id)) continue;
      rows.push({
        id: account.id,
        place: placeOf(account.shared, account.branchName, '', t('agent.shared'), t('agent.local')),
        account,
      });
    }
    return rows;
  };

  return (
    <div className="ag-agent-controls">
      <div className="ag-agent-controls__row">
        <div>
          <strong>{t('agent.brand')}{scope ? ` · ${scopeName}` : ''}</strong>
          <p>{agentLocked ? t('agent.locked') : agentEnabled ? t('agent.brandOn') : t('agent.brandOff')}</p>
        </div>
        {pending === 'brand' || agentBusy ? <IonSpinner name="crescent" /> : (
          <button
            type="button"
            role="switch"
            className={`ag-agent-switch${agentEnabled ? ' is-on' : ''}`}
            aria-checked={agentEnabled}
            aria-label={t(agentEnabled ? 'agent.turnOff' : 'agent.turnOn')}
            disabled={brandLocked}
            onClick={() => void toggleAgent()}
          />
        )}
      </div>
      {loading ? <p className="ag-agent-controls__status" role="status">{t('agent.loadingScope')}</p> : null}
      {failed ? <p className="ag-agent-controls__status" role="alert">{t('agent.scopeError')}</p> : null}
      {scope?.globalCanToggle === false ? <p className="ag-agent-controls__status">{t('agent.scopeReadOnly')}</p> : null}
      {policy ? channels.map((channel) => (
        <section key={channel} aria-label={channelLabel(channel)}>
          <div className="ag-agent-controls__row">
            <div className="ag-agent-controls__channel">
              <ChannelIcon channel={channel} />
              <strong>{channelLabel(channel)}</strong>
              <em>{policy.channels[channel].isOn ? 'ON' : 'OFF'}</em>
            </div>
            {pending === channel ? <IonSpinner name="crescent" /> : (
              <button
                type="button"
                role="switch"
                className={`ag-agent-switch${policy.channels[channel].isOn ? ' is-on' : ''}`}
                aria-checked={policy.channels[channel].isOn}
                aria-label={`${t('agent.brand')} · ${channelLabel(channel)}`}
                disabled={channelsLocked}
                onClick={() => void setChannel(channel, !policy.channels[channel].isOn)}
              />
            )}
          </div>
          {channel === 'whatsapp' && scope?.mode === 'per_branch' ? (
            <div className="ag-agent-controls__numbers" aria-label={t('agent.localNumbers')}>
              <p>{t('agent.localNumbers')}</p>
              {numberRows().map((row) => {
                const account = row.account;
                const hint = !account
                  ? ''
                  : !account.canToggle
                    ? t('agent.scopeReadOnly')
                    : !account.effectiveIsOn && account.isOn
                      ? t('agent.inheritedOff')
                      : account.shared ? t('agent.sharedNumber') : '';
                return (
                  <div className="ag-agent-controls__row" key={row.id}>
                    <div>
                      <strong>{row.phone || t('ops.filters.numberUnavailable')}</strong>
                      <span>{row.place}</span>
                      {hint ? <p>{hint}</p> : null}
                    </div>
                    {account && pending === account.id ? <IonSpinner name="crescent" /> : account ? (
                      <button
                        type="button"
                        role="switch"
                        className={`ag-agent-switch${account.isOn ? ' is-on' : ''}`}
                        aria-checked={account.isOn}
                        aria-label={`${t('agent.brand')} · ${row.place}`}
                        disabled={!account.canToggle || Boolean(pending)}
                        onClick={() => void setAccount(account.id, !account.isOn)}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {channel === 'whatsapp' && scope && scope.mode !== 'per_branch' && numberRows().length > 0 ? (
            <div className="ag-agent-controls__numbers">
              {numberRows().map((row) => (
                <div className="ag-agent-controls__row" key={row.id}>
                  <div>
                    <strong>{row.phone || t('ops.filters.numberUnavailable')}</strong>
                    <span>{row.place}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )) : null}
      {!agentEnabled && policy ? <p className="ag-agent-controls__status">{t('agent.storedChannels')}</p> : null}
    </div>
  );
}
