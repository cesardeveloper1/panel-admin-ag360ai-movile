import { useEffect, useState } from 'react';
import { orderService } from '../../services/orderService';
import { isWithinFleetHours } from './fleetHours';

export function useFleetSchedule(enabled: boolean) {
  const [windowHours, setWindowHours] = useState<{ startTime: string | null; endTime: string | null } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () => {
      void orderService.getFleetSchedule()
        .then((schedule) => { if (active) setWindowHours(schedule); })
        .catch(() => undefined);
    };
    load();
    const poll = window.setInterval(load, 60_000);
    const clock = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => {
      active = false;
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [enabled]);

  void tick;
  const withinHours = !windowHours || isWithinFleetHours(windowHours.startTime, windowHours.endTime);
  return { withinHours };
}
