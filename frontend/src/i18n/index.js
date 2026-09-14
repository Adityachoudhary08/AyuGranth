import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './en.json'
import hi from './hi.json'
import ta from './ta.json'
import te from './te.json'
import mr from './mr.json'

const SUPPORTED_LANGUAGES = ['en', 'hi', 'ta', 'te', 'mr']

// Read saved language from localStorage, fallback to 'en'
const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('aayugranth_lang') || 'en'
  : 'en'

const initialLang = SUPPORTED_LANGUAGES.includes(savedLang) ? savedLang : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      mr: { translation: mr },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      // React already escapes values
      escapeValue: false,
    },
    // No dynamic loading — all languages bundled at build time
    partialBundledLanguages: false,
  })

export default i18n
export { SUPPORTED_LANGUAGES }
