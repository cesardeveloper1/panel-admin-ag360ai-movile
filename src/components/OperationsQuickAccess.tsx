import { useEffect, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { optionsOutline, chatbubblesOutline, notificationsOutline, gridOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { OperationsQuickMessages } from './OperationsQuickMessages';
import { canNavigate } from '../navigation/navigationAccess';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { CHATS_PATH, NOTIFICATIONS_PATH } from '../navigation/navConfig';

const storageKey = 'ag.operations.quickAccess.v1';
type Access = 'filters' | 'chats' | 'alerts' | 'messages';
function readPins(): Access[] {
  try { const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return Array.isArray(stored) ? stored.filter((key): key is Access => ['filters', 'chats', 'alerts', 'messages'].includes(key)) : ['filters'];
  } catch { return ['filters']; }
}
export function OperationsQuickAccess({ onFilters }: { onFilters: () => void }) {
  const { t } = useTranslation();
  const { session, brand, authEpoch } = useApp();
  const [messagesOpen, setMessagesOpen] = useState(false);
  useEffect(() => { setMessagesOpen(false); setOpen(false); }, [authEpoch, brand?.id]);
  const { go } = useAppNavigation();
  const root = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Access[]>(readPins);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  const actions = [
    { id: 'messages' as const, icon: chatbubblesOutline, label: t('ops.filters.quickMessages'), run: () => setMessagesOpen(true) },
    { id: 'filters' as const, icon: optionsOutline, label: t('ops.filters.title'), run: onFilters },
    { id: 'chats' as const, icon: chatbubblesOutline, label: t('nav.chats'), run: () => go(CHATS_PATH) },
    { id: 'alerts' as const, icon: notificationsOutline, label: t('nav.alerts'), run: () => go(NOTIFICATIONS_PATH) },
  ].filter(action => action.id !== 'chats' || canNavigate(session, CHATS_PATH));
  const toggle = (id: Access) => {
    const next = pins.includes(id) ? pins.filter(key => key !== id) : [...pins, id];
    setPins(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Preferences remain usable in memory. */ }
  };
  return <><div ref={root} className="ops-quick-access">
    {actions.filter(action => pins.includes(action.id)).map(action => <button className="ag-btn" type="button" key={action.id} aria-label={action.label} onClick={action.run}><IonIcon icon={action.icon} aria-hidden="true" /></button>)}
    <button className="ag-btn" type="button" aria-label={t('ops.filters.quickAccess')} aria-expanded={open} onClick={() => setOpen(!open)}><IonIcon icon={gridOutline} aria-hidden="true" /></button>
    {open ? <div className="ops-quick-panel"><strong>{t('ops.filters.quickAccess')}</strong>{actions.map(action => <div className="ops-quick-row" key={action.id}>
      <button type="button" className="ag-btn" onClick={() => { setOpen(false); action.run(); }}><IonIcon icon={action.icon} aria-hidden="true" />{action.label}</button>
      <label><input type="checkbox" checked={pins.includes(action.id)} onChange={() => toggle(action.id)} />{t('ops.filters.pin')}</label>
    </div>)}<button type="button" className="ag-btn" onClick={() => setOpen(false)}>{t('ops.filters.cancel')}</button></div> : null}
  </div><OperationsQuickMessages open={messagesOpen} onClose={() => setMessagesOpen(false)} /></>;
}
