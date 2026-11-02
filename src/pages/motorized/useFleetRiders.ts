import { subscribeFleetRidersChanged } from '../../services/fleetRiderEvents';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../hooks/useApp';
import { deliveryPartnerClient } from '../../services/deliveryPartnerClient';

type Rider = Awaited<ReturnType<typeof deliveryPartnerClient.listRiders>>[number];
/** Shared freshness policy for the fleet list and assignment selector. */
export function useFleetRiders() {
  const {session, authEpoch} = useApp();
  const enabled = session?.role === 'motorized';
  const scope = `${authEpoch}|${session?.id ?? session?.email ?? ''}|${enabled}`;
  const [result, setResult] = useState<{scope: string; riders: Rider[] | null; error: boolean}>({scope:'',riders:null,error:false});
  const run = useRef<() => void>(() => {});
  useEffect(() => {
    let alive = true;
    let busy = false;
    let pending = false;
    let eventTimer: ReturnType<typeof setTimeout> | undefined;
    setResult({scope,riders:enabled?null:[],error:false});
    if (!enabled) return;
    const load = async () => {
      if (!alive) return;
      if (busy) {pending=true;return;}
      busy = true;
      try {
        const riders = await deliveryPartnerClient.listRiders();
        if (alive) setResult({scope,riders,error:false});
      } catch {
        // Never keep a stale rider assignable after a failed scope check.
        if (alive) setResult({scope,riders:[],error:true});
      } finally {busy=false;if(alive && pending){pending=false;void load();}}
    };
    const refresh = () => {void load();};
    const visible = () => {if(document.visibilityState==='visible') refresh();};
    run.current = refresh;
    refresh();
    const stop = subscribeFleetRidersChanged(() => {
      if (eventTimer) return;
      eventTimer=setTimeout(()=>{eventTimer=undefined;refresh();},100);
    });
    window.addEventListener('online',refresh);
    window.addEventListener('focus',visible);
    document.addEventListener('visibilitychange',visible);
    return () => {
      alive=false;run.current=()=>{};clearTimeout(eventTimer);stop();
      window.removeEventListener('online',refresh);window.removeEventListener('focus',visible);
      document.removeEventListener('visibilitychange',visible);
    };
  }, [scope, enabled]);
  const current = result.scope===scope ? result : {riders:enabled?null:[],error:false};
  return {...current, loading:current.riders===null, refresh:useCallback(()=>run.current(),[])};
}
