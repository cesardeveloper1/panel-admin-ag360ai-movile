import { useEffect, useState } from 'react';
import { StackLayout } from '../components/layouts';
import { useApp } from '../hooks/useApp';
import { apiFacade, type QuickMessage } from '../services/apiFacade';
import { useTranslation } from 'react-i18next';

const QuickMessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const { brand, authEpoch } = useApp();
  const [result, setResult] = useState<{ scope: string; items: QuickMessage[] } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
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

  return (
    <StackLayout title={t('ops.filters.quickMessages')} showAlerts={false} bodyClassName="ag-body module-body ag-page-stack quick-messages">
      {error || !brandId ? (
        <div role="alert">
          <p>{t('ops.reliability.unavailable')}</p>
          <button type="button" className="ag-btn" onClick={() => setRetry((value) => value + 1)}>{t('ops.reliability.retry')}</button>
        </div>
      ) : !items ? (
        <p role="status">{t('ops.filters.loadingMessages')}</p>
      ) : items.length === 0 ? (
        <p>{t('ops.filters.noMessages')}</p>
      ) : (
        <>
          <p>{t('ops.filters.messagesHint')}</p>
          {items.map((item) => (
            <article className="ops-connection" key={item._id}>
              <strong>/{item.shortcut}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </>
      )}
    </StackLayout>
  );
};

export default QuickMessagesPage;
