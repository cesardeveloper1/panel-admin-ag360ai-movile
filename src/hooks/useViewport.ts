import { useEffect, useState } from 'react';

const TABLET_MIN = 768;

export function useViewport() {
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= TABLET_MIN : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${TABLET_MIN}px)`);
    const sync = () => setIsTablet(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return { isTablet, tabletMin: TABLET_MIN };
}
