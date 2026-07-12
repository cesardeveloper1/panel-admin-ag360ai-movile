import { createAnimation } from '@ionic/react';
import type { AnimationBuilder } from '@ionic/core';

/** Crossfade global para que todos los cambios de página se sientan suaves. */
export const fadeNavAnimation: AnimationBuilder = (_baseEl, opts) => {
  const root = createAnimation('ag-page-fade')
    .duration(420)
    .easing('cubic-bezier(0.4, 0, 0.2, 1)');

  const entering = createAnimation('ag-page-fade-enter')
    .addElement(opts.enteringEl)
    .beforeStyles({ zIndex: '101' })
    .keyframes([
      { offset: 0, opacity: '0' },
      { offset: 0.38, opacity: '0' },
      { offset: 1, opacity: '1' },
    ])
    .afterClearStyles(['z-index', 'opacity']);

  root.addAnimation(entering);

  if (opts.leavingEl) {
    const leaving = createAnimation('ag-page-fade-leave')
      .addElement(opts.leavingEl)
      .beforeStyles({ zIndex: '100' })
      .keyframes([
        { offset: 0, opacity: '1' },
        { offset: 0.62, opacity: '0' },
        { offset: 1, opacity: '0' },
      ])
      .afterClearStyles(['z-index', 'opacity']);
    root.addAnimation(leaving);
  }

  return root;
};

/** Alias temporal para las llamadas existentes de selección de marca. */
export const instantNavAnimation = fadeNavAnimation;
