import { useEffect, useState } from 'react';
import { IonContent, IonHeader, IonModal, IonToolbar } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../hooks/useApp';
import { apiFacade, type QuickMessage } from '../services/apiFacade';
export function OperationsQuickMessages({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { brand, authEpoch } = useApp();
  const [result, setResult] = useState<{ scope: string; items: QuickMessage[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const brandId = brand?.id;
  const scope = `${authEpoch}|${brandId}`;
  useEffect(() => {
    let active = true;
    setResult(null); setError(false);
    if (!open || !brandId) return;
    void apiFacade.listQuickMessages(brandId).then(items => {
      if (active) setResult({ scope, items });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [open, brandId, scope, retry]);
  const items = result?.scope === scope ? result.items : null;
  return <IonModal className="ops-filters-modal" isOpen={open} onDidDismiss={onClose} aria-label={t('ops.filters.quickMessages')}>
    <IonHeader><IonToolbar><div className="ops-filters-heading"><h2>{t('ops.filters.quickMessages')}</h2><button type="button" className="ag-btn" onClick={onClose}>{t('ops.filters.cancel')}</button></div></IonToolbar></IonHeader>
    <IonContent className="ops-filters-content"><div className="ops-filters-fields">
      {error ? <div role="alert"><p>{t('ops.reliability.unavailable')}</p><button type="button" className="ag-btn" onClick={() => setRetry(value => value + 1)}>{t('ops.reliability.retry')}</button></div> :
        !items ? <p role="status">{t('ops.filters.loadingMessages')}</p> : items.length === 0 ? <p>{t('ops.filters.noMessages')}</p> : <>
          <p>{t('ops.filters.messagesHint')}</p>{items.map(item => <article className="ops-connection" key={item._id}><strong>/{item.shortcut}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{item.text}</p></article>)}
        </>}
    </div></IonContent>
  </IonModal>;
}
