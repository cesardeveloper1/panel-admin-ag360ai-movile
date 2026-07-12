import { IonIcon } from '@ionic/react';
import { hardwareChipOutline, powerOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';

export function AgentToggle() {
  const { t } = useTranslation();
  const { agentEnabled, toggleAgent } = useApp();

  return (
    <button
      type="button"
      className={`ag-agent-toggle${agentEnabled ? ' is-on' : ' is-off'}`}
      aria-label={t(agentEnabled ? 'agent.turnOff' : 'agent.turnOn')}
      aria-pressed={agentEnabled}
      onClick={toggleAgent}
    >
      <IonIcon icon={agentEnabled ? hardwareChipOutline : powerOutline} aria-hidden="true" />
      <span>{t(agentEnabled ? 'agent.on' : 'agent.off')}</span>
    </button>
  );
}
