import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { chatboxEllipsesOutline } from 'ionicons/icons';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { apiFacade, type QuickMessage } from '../services/apiFacade';
import { useTranslation } from 'react-i18next';

export function QuickMessageCard({ item }: { item: QuickMessage }) {
  return <article className="quick-message-card">
    <strong className="quick-message-shortcut">/{item.shortcut}</strong>
    <p>{item.text}</p>
  </article>;
}

const QuickMessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, authEpoch } = useApp();
  const [result, setResult] = useState<{ scope: string; items: QuickMessage[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const brandId = brand?.id;
  const scope = `${authEpoch}|${brandId}`;

  useEffect(() => {
    let active = true;
    setResult(null);
    setError(false);
    if (!brandId) return;
    void apiFacade.listQuickMessages(brandId).then((items) => {
      if (active) setResult({ scope, items });
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, [brandId, scope, retry]);

  const items = result?.scope === scope ? result.items : null;

  const search = query.trim().toLocaleLowerCase();
  const visibleItems = items?.filter(item => !search || `${item.shortcut} ${item.text}`.toLocaleLowerCase().includes(search));
  return (
    <StackLayout title={t('ops.filters.quickMessages')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack quick-messages"
      search={{ value: query, onChange: setQuery, placeholder: t('quickMessages.search') }}>

      {error || !brandId ? (
        <div className="quick-message-feedback" role="alert">
          <p>{t('ops.reliability.unavailable')}</p>
          <button type="button" className="ag-btn" onClick={() => setRetry((value) => value + 1)}>{t('ops.reliability.retry')}</button>
        </div>
      ) : !items ? (
        <p role="status">{t('ops.filters.loadingMessages')}</p>
      ) : visibleItems?.length === 0 ? (
        <div className="quick-message-feedback" role="status"><IonIcon icon={chatboxEllipsesOutline} aria-hidden="true" /><p>{t(search ? 'quickMessages.noMatches' : 'ops.filters.noMessages')}</p></div>
      ) : (
        <>
          <p className="quick-message-hint">{t('ops.filters.messagesHint')}</p>
          {visibleItems?.map(item => <QuickMessageCard key={item._id} item={item} />)}
        </>
      )}
    </StackLayout>
  );
};

export default QuickMessagesPage;
