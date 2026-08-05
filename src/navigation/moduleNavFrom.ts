import { PAYMENTS_PATH } from './navConfig';

/** Origen del hub al entrar a módulos (Ionic no conserva bien location.state). */
let moduleNavFrom: string = PAYMENTS_PATH;

export function setModuleNavFrom(path: string) {
  moduleNavFrom = path;
}

export function getModuleNavFrom(fallback = PAYMENTS_PATH) {
  return moduleNavFrom || fallback;
}
