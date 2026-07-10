import { createAnimation } from '@ionic/react';
import { iosTransitionAnimation } from '@ionic/core';

/** Transición instantánea solo para cambios de marca (welcome ↔ agilito). */
export function instantNavAnimation() {
  return createAnimation('ag-instant-nav').duration(0);
}

export { iosTransitionAnimation };
