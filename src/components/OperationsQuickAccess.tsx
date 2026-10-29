import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IonIcon, IonSearchbar } from '@ionic/react';
import { searchOutline, locationOutline, calendarOutline, chatbubblesOutline, chatboxEllipsesOutline, optionsOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import type { OperationsPanel } from './OperationsFilters';
import { useApp } from '../hooks/useApp';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { QUICK_MESSAGES_PATH } from '../navigation/appRouteRegistry';

const storageKey = 'ag.operations.actions.v1';
type Pin = 'date' | 'messages';
function readPins(): Pin[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return Array.isArray(stored) ? stored.filter((key): key is Pin => key === 'date' || key === 'messages') : ['date'];
  } catch { return ['date']; }
}

function ActionPin({ checked, disabled = false, label, ariaLabel, onChange }: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  ariaLabel: string;
  onChange?: () => void;
}) {
  return <label className={`ops-actions-pin${checked ? ' is-on' : ''}${disabled ? ' is-fixed' : ''}`}>
    <input type="checkbox" checked={checked} disabled={disabled} aria-label={ariaLabel} onChange={() => onChange?.()} />
    <span className="ops-actions-box" aria-hidden="true">
      {checked ? <svg viewBox="0 0 16 16" className="ops-actions-tick"><path d="M3.2 8.2 6.4 11.4 12.8 4.6" /></svg> : null}
    </span>
    <span>{label}</span>
  </label>;
}

export function OperationsQuickAccess({ mode, query, onQueryChange, panel, onPanel, branchCount, children }: {
  mode: 'orders' | 'funnel';
  query: string;
  onQueryChange: (value: string) => void;
  panel: OperationsPanel | null;
  onPanel: (panel: OperationsPanel | null) => void;
  branchCount?: number;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { go } = useAppNavigation();
  const { brand, authEpoch } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>(readPins);
  useEffect(() => { setSearchOpen(false); setMenuOpen(false); onPanel(null); }, [authEpoch, brand?.id, onPanel]);
  useEffect(() => {
    if (!searchOpen && !menuOpen && !panel) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) { setSearchOpen(false); setMenuOpen(false); onPanel(null); }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSearchOpen(false); setMenuOpen(false); onPanel(null); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [searchOpen, menuOpen, panel, onPanel]);
  const toggle = (id: Pin) => {
    const next = pins.includes(id) ? pins.filter(key => key !== id) : [...pins, id];
    setPins(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Preferences remain usable in memory. */ }
  };
  const openPanel = (next: OperationsPanel) => {
    setSearchOpen(false);
    setMenuOpen(false);
    onPanel(panel === next ? null : next);
  };
  const showLocal = branchCount !== 1;
  const localDisabled = branchCount === 0;
  const pinned = [
    { id: 'date' as const, icon: calendarOutline, label: t('ops.filters.filterDate'), show: mode === 'orders', run: () => openPanel('date') },
    { id: 'messages' as const, icon: chatboxEllipsesOutline, label: t('ops.filters.quickMessages'), show: true, run: () => { setMenuOpen(false); setSearchOpen(false); onPanel(null); go(QUICK_MESSAGES_PATH); } },
  ];
  return <div ref={root} className="ops-tools">
    <button className="ops-tool-btn" type="button" aria-label={t('ops.filters.searchAction')} aria-expanded={searchOpen} onClick={() => { onPanel(null); setMenuOpen(false); setSearchOpen(open => !open); }}><IonIcon icon={searchOutline} aria-hidden="true" /></button>
    <button className="ops-tool-btn" type="button" aria-label={t('ops.filters.channel')} aria-expanded={panel === 'channel'} onClick={() => openPanel('channel')}><IonIcon icon={chatbubblesOutline} aria-hidden="true" /></button>
    {showLocal ? <button className="ops-tool-btn" type="button" aria-label={t('ops.filters.filterLocal')} aria-expanded={panel === 'local'} disabled={localDisabled} title={localDisabled ? t('ops.filters.noLocals') : t('ops.filters.filterLocal')} onClick={() => openPanel('local')}><IonIcon icon={locationOutline} aria-hidden="true" /></button> : null}
    {pinned.filter(action => action.show && pins.includes(action.id)).map(action =>
      <button className="ops-tool-btn" type="button" key={action.id} aria-label={action.label} aria-expanded={action.id === 'date' ? panel === 'date' : undefined} onClick={action.run}><IonIcon icon={action.icon} aria-hidden="true" /></button>)}
    <button className="ops-actions-toggle" type="button" aria-label={t('ops.filters.actions')} aria-expanded={menuOpen} onClick={() => { setSearchOpen(false); onPanel(null); setMenuOpen(open => !open); }}><IonIcon icon={optionsOutline} aria-hidden="true" /><span className="ops-actions-toggle__label">{t('ops.filters.actions')}</span></button>
    {searchOpen ? <div className="ops-filter-popover ops-filter-popover--search" role="dialog" aria-label={t('ops.filters.searchAction')}>
      <div className="ops-filter-popover__bar"><h3>{t('ops.filters.searchAction')}</h3></div>
      <IonSearchbar className="ops-search" value={query} onIonInput={event => onQueryChange(event.detail.value ?? '')} placeholder={mode === 'funnel' ? t('ops.funnel.search') : t('ops.search')} debounce={200} />
    </div> : null}
    {menuOpen ? <div className="ops-filter-popover ops-actions-menu" role="menu" aria-label={t('ops.filters.actions')}>
      <div className="ops-filter-popover__bar"><h3>{t('ops.filters.actions')}</h3></div>
      <ul className="ops-actions-list">
        <li className="ops-actions-row">
          <button type="button" role="menuitem" onClick={() => { onPanel(null); setMenuOpen(false); setSearchOpen(true); }}>{t('ops.filters.searchAction')}</button>
          <ActionPin checked disabled label={t('ops.filters.alwaysOn')} ariaLabel={`${t('ops.filters.alwaysOn')} ${t('ops.filters.searchAction')}`} />
        </li>
        <li className="ops-actions-row">
          <button type="button" role="menuitem" onClick={() => openPanel('channel')}>{t('ops.filters.channel')}</button>
          <ActionPin checked disabled label={t('ops.filters.alwaysOn')} ariaLabel={`${t('ops.filters.alwaysOn')} ${t('ops.filters.channel')}`} />
        </li>
        {showLocal ? <li className="ops-actions-row">
          <button type="button" role="menuitem" disabled={localDisabled} onClick={() => openPanel('local')}>{t('ops.filters.filterLocal')}</button>
          <ActionPin checked disabled label={t('ops.filters.alwaysOn')} ariaLabel={`${t('ops.filters.alwaysOn')} ${t('ops.filters.filterLocal')}`} />
        </li> : null}
        {pinned.filter(action => action.show).map(action => <li className="ops-actions-row" key={action.id}>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); action.run(); }}>{action.label}</button>
          <ActionPin checked={pins.includes(action.id)} label={t('ops.filters.pin')} ariaLabel={`${t('ops.filters.pin')} ${action.label}`} onChange={() => toggle(action.id)} />
        </li>)}
      </ul>
    </div> : null}
    {children}
  </div>;
}
