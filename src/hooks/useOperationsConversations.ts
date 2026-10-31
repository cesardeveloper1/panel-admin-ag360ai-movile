import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatSocket } from './useChatSocket';
import { readConversationPage, type ConversationFilters, type ConversationPage } from '../services/operationsConversations';
import type { FunnelStage } from '../types/contact';

const STAGES: FunnelStage[] = ['INICIAL', 'PIDIENDO', 'HUMANO', 'CON_PEDIDO'];
type Columns = Record<FunnelStage, ConversationPage>;
const emptyPage = (): ConversationPage => ({items: [], total: null, nextCursor: null, hasMore: false});
const empty = (): Columns => ({INICIAL: emptyPage(), PIDIENDO: emptyPage(), HUMANO: emptyPage(), CON_PEDIDO: emptyPage()});

/** Socket payloads are wakeups, never authoritative membership or permission data. */
export function useOperationsConversations(filters: ConversationFilters, scope: string, enabled: boolean) {
  const { subscribeOperationsChanged } = useChatSocket();
  const key = JSON.stringify([scope, filters, enabled]);
  const [result, setResult] = useState({key: '', columns: empty(), loading: true, error: false, loadingMore: false});
  const actions = useRef({refresh: () => {}, more: (_stage: FunnelStage) => {}});
  useEffect(() => {
    let alive = true;
    let busy = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    let columns = empty();
    const pageCounts = Object.fromEntries(STAGES.map(stage => [stage, 1])) as Record<FunnelStage, number>;
    setResult({key, columns, loading: enabled, error: false, loadingMore: false});
    if (!enabled) return;
    const publish = (error = false, loadingMore = false) => {
      if (alive) setResult({key, columns: {...columns}, loading: false, error, loadingMore});
    };
    const refresh = async () => {
      if (!alive) return;
      if (busy) {pending = true; return;}
      busy = true;
      try {
        const pages = await Promise.all(STAGES.map(async stage => {
          let page = await readConversationPage(filters, stage, undefined, controller.signal);
          // Rebuild the loaded window so arrivals/removals cannot corrupt its cursors.
          const seen = new Set<string>();
          for (let i = 1; i < pageCounts[stage] && page.hasMore; i++) {
            const cursor = page.nextCursor!;
            if (seen.has(cursor)) throw new Error('Repeated operations cursor');
            seen.add(cursor);
            const next = await readConversationPage(filters, stage, cursor, controller.signal);
            page = {...next, total: page.total, items: [...new Map([...page.items, ...next.items].map(item => [item._id, item])).values()]};
          }
          return [stage, page] as const;
        }));
        if (!alive) return;
        columns = Object.fromEntries(pages) as Columns;
        publish();
      } catch {
        // Do not retain conversations after a denied/failed scope reconciliation.
        columns = empty(); publish(true);
      } finally {
        busy = false;
        if (alive && pending) {pending = false; schedule();}
      }
    };
    const schedule = () => {
      if (!alive || timer) return;
      timer = setTimeout(() => {timer = undefined; void refresh();}, 300);
    };
    const more = async (stage: FunnelStage) => {
      const page = columns[stage];
      if (busy || !page.hasMore || !page.nextCursor || !alive) return;
      busy = true; publish(false, true);
      try {
        const next = await readConversationPage(filters, stage, page.nextCursor, controller.signal);
        if (!alive) return;
        if (next.hasMore && next.nextCursor === page.nextCursor) throw new Error('Repeated operations cursor');
        columns = {...columns, [stage]: {...next, total: page.total, items: [...new Map([...page.items, ...next.items].map(item => [item._id, item])).values()]}};
        pageCounts[stage] += 1; publish();
      } catch {columns = empty(); publish(true);}
      finally {busy = false; if (alive && pending) {pending = false; schedule();}}
    };
    actions.current = {refresh: schedule, more: stage => {void more(stage);}};
    schedule();
    const stop = subscribeOperationsChanged(schedule);
    const interval = setInterval(schedule, 30_000);
    const visible = () => {if (document.visibilityState === 'visible') schedule();};
    window.addEventListener('online', schedule);
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false; controller.abort(); clearTimeout(timer); clearInterval(interval); stop();
      window.removeEventListener('online', schedule); window.removeEventListener('focus', schedule);
      document.removeEventListener('visibilitychange', visible);
      actions.current = {refresh: () => {}, more: () => {}};
    };
    // The serialized key includes every filter, auth generation and enabled state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subscribeOperationsChanged]);
  const current = result.key === key ? result : {columns: empty(), loading: enabled, error: false, loadingMore: false};
  return {...current, refresh: useCallback(() => actions.current.refresh(), []), loadMore: useCallback((stage: FunnelStage) => actions.current.more(stage), [])};
}
