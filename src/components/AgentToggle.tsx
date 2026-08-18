import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';

export function AgentToggle() {
  const { t } = useTranslation();
  const { agentEnabled, agentLocked, agentBusy, toggleAgent } = useApp();
  const disabled = agentBusy || agentLocked;

  return (
    <button
      type="button"
      className={`ag-agent-toggle${agentEnabled ? ' is-on' : ' is-off'}${agentLocked ? ' is-locked' : ''}`}
      aria-label={
        agentLocked
          ? t('agent.locked')
          : t(agentEnabled ? 'agent.turnOff' : 'agent.turnOn')
      }
      aria-pressed={agentEnabled}
      aria-busy={agentBusy}
      disabled={disabled}
      title={agentLocked ? t('agent.locked') : undefined}
      onClick={() => void toggleAgent()}
    >
      <svg className="ag-agent-bot-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v3" />
        <circle cx="12" cy="2.5" r="1" />
        <rect x="4" y="6" width="16" height="13" rx="3" />
        <path d="M4 11H2M22 11h-2" />
        <circle cx="9" cy="11" r="1" className="ag-agent-bot-icon__eye" />
        <circle cx="15" cy="11" r="1" className="ag-agent-bot-icon__eye" />
        <path d="M9 15h6" />
        {!agentEnabled ? <path d="M3 3l18 18" className="ag-agent-bot-icon__off" /> : null}
      </svg>
      <span>{t(agentEnabled ? 'agent.on' : 'agent.off')}</span>
    </button>
  );
}
