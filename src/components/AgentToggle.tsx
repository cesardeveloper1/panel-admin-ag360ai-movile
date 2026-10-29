import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';

export function AgentToggle({ onPress, expanded, controlsId, appearance = 'pill' }: {
  onPress?: () => void;
  expanded?: boolean;
  controlsId?: string;
  /** En Agilito un robot abre el panel de canales. */
  appearance?: 'pill' | 'icon';
} = {}) {
  const { t } = useTranslation();
  const { session, agentEnabled, agentLocked, agentBusy, toggleAgent } = useApp();
  // This endpoint controls the whole brand, never a manager's selected location.
  if (!session || !['owner', 'superadmin'].includes(session.role)) return null;
  const opensMenu = Boolean(onPress);
  const disabled = !opensMenu && (agentBusy || agentLocked);

  if (appearance === 'icon') {
    return (
      <button
        type="button"
        className={`agilito-agent-trigger${agentEnabled ? ' is-on' : ' is-off'}${agentLocked ? ' is-locked' : ''}`}
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-controls={controlsId}
        aria-label={t('agent.open')}
        aria-busy={agentBusy}
        title={agentLocked ? t('agent.locked') : undefined}
        onClick={() => onPress?.()}
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
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`ag-agent-toggle${agentEnabled ? ' is-on' : ' is-off'}${agentLocked ? ' is-locked' : ''}`}
      aria-label={
        opensMenu
          ? t('agent.open')
          : agentLocked
            ? t('agent.locked')
            : t(agentEnabled ? 'agent.turnOff' : 'agent.turnOn')
      }
      aria-pressed={opensMenu ? undefined : agentEnabled}
      aria-haspopup={opensMenu ? 'menu' : undefined}
      aria-expanded={opensMenu ? expanded : undefined}
      aria-controls={opensMenu ? controlsId : undefined}
      aria-busy={agentBusy}
      disabled={disabled}
      title={agentLocked ? t('agent.locked') : undefined}
      onClick={() => onPress ? onPress() : void toggleAgent()}
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
