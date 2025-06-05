import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import ruTranslations from './resources/ru.json';
import enTranslations from './resources/en.json';
import heTranslations from './resources/he.json';

const resources = {
  ru: {
    translation: ruTranslations,
  },
  en: {
    translation: enTranslations,
  },
  he: {
    translation: heTranslations,
  },
};

// RTL languages configuration
const RTL_LANGUAGES = ['he', 'ar'];

const languageDetectorOptions = {
  // Order of detection
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Keys for localStorage - use same key as LanguageSwitcher
  lookupLocalStorage: 'preferred-language',
  
  // Cache user language on localStorage
  caches: ['localStorage'],
  
  // Optional: exclude certain languages from detection
  excludeCacheFor: ['cimode'],
  
  // Only detect from these languages
  checkWhitelist: true,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // Language detection configuration
    detection: languageDetectorOptions,
    
    // Fallback language
    fallbackLng: 'ru',
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Default namespace
    defaultNS: 'translation',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Pluralization and context
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // Load resources synchronously for better UX
    initImmediate: false,
    
    // Language whitelist
    supportedLngs: ['ru', 'en', 'he'],
    nonExplicitSupportedLngs: true,
  });

// Handle RTL/LTR direction changes
i18n.on('languageChanged', (lng: string) => {
  const direction = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', lng);
});

// Set initial direction
const currentLanguage = i18n.language || 'ru';
const initialDirection = RTL_LANGUAGES.includes(currentLanguage) ? 'rtl' : 'ltr';
document.documentElement.setAttribute('dir', initialDirection);
document.documentElement.setAttribute('lang', currentLanguage);

export default i18n;