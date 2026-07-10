import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';

const savedLang =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('ag360-lang') ?? 'es'
    : 'es';

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;

export function setAppLanguage(lang: 'es' | 'en') {
  void i18n.changeLanguage(lang);
  localStorage.setItem('ag360-lang', lang);
}
