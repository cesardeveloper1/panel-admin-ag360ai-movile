import { createAnimation } from '@ionic/react';
import type { AnimationBuilder } from '@ionic/core';

/** Crossfade global para que todos los cambios de página se sientan suaves. */
export const fadeNavAnimation: AnimationBuilder = (_baseEl, opts) => {
  const root = createAnimation('ag-page-fade')
    .duration(220)
    .easing('cubic-bezier(0.4, 0, 0.2, 1)');

  const entering = createAnimation('ag-page-fade-enter')
    .addElement(opts.enteringEl)
    .fromTo('opacity', '0', '1');

  root.addAnimation(entering);

  if (opts.leavingEl) {
    const leaving = createAnimation('ag-page-fade-leave')
      .addElement(opts.leavingEl)
      .fromTo('opacity', '1', '0');
    root.addAnimation(leaving);
  }

  return root;
};

/** Alias temporal para las llamadas existentes de selección de marca. */
export const instantNavAnimation = fadeNavAnimation;
