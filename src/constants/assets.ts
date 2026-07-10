/** Logos oficiales (mismos URLs que panel-admin-ag360ai). */
export const LOGO_WHITE =
  'https://cloudinarycopy.blob.core.windows.net/imagenes/agiliza-assets/LittleLogo-White-Full.png';

export const LOGO_COLOR =
  'https://res.cloudinary.com/dzhf15d4o/image/upload/v1756419273/LogoAgiliza360_heewhs.png';

/** Icono sin texto (sidebar colapsado del panel). Solo para launcher/splash nativos. */
export const LOGO_ICON_URL =
  'https://res.cloudinary.com/dzhf15d4o/image/upload/v1756419271/LittleLogo_b8zmxw.png';

import logoWhiteBundled from '../assets/logo-white.png';
import logoColorBundled from '../assets/logo-color.png';
import logoIconBundled from '../assets/logo-icon.png';

/** Rutas empaquetadas por Vite (funcionan en web y Capacitor). */
export const LOGO_WHITE_LOCAL = logoWhiteBundled;
export const LOGO_COLOR_LOCAL = logoColorBundled;

/** Solo empaquetado para script de iconos Android (no usar en UI). */
export const LOGO_ICON_LOCAL = logoIconBundled;
