import { createAnimation } from '@ionic/react';
import type { AnimationBuilder } from '@ionic/core';

/**
 * Crossfade sin hueco negro: la salida no desaparece antes de que la entrada
 * tenga opacidad (antes entering quedaba en 0 hasta el 38% → flash negro).
 */
export const fadeNavAnimation: AnimationBuilder = (_baseEl, opts) => {
  const root = createAnimation('ag-page-fade')
    .duration(320)
    .easing('cubic-bezier(0.4, 0, 0.2, 1)');

  const entering = createAnimation('ag-page-fade-enter')
    .addElement(opts.enteringEl)
    .beforeStyles({ zIndex: '101' })
    .keyframes([
      { offset: 0, opacity: '0' },
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
        { offset: 1, opacity: '0' },
      ])
      .afterClearStyles(['z-index', 'opacity']);
    root.addAnimation(leaving);
  }

  return root;
};

/**
 * Sin fade: evita pantalla negra (entering opacity 0 + leaving opacity 0).
 * Usar en Volver a hub / root replace.
 */
export const instantNavAnimation: AnimationBuilder = (_baseEl, opts) => {
  const root = createAnimation('ag-page-instant').duration(1);

  if (opts.enteringEl) {
    root.addAnimation(
      createAnimation('ag-page-instant-enter')
        .addElement(opts.enteringEl)
        .beforeClearStyles(['opacity', 'z-index'])
        .fromTo('opacity', '1', '1'),
    );
  }

  if (opts.leavingEl) {
    root.addAnimation(
      createAnimation('ag-page-instant-leave')
        .addElement(opts.leavingEl)
        .beforeClearStyles(['opacity', 'z-index'])
        .fromTo('opacity', '1', '1'),
    );
  }

  return root;
};
