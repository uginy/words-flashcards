// Translation resource types for type-safe i18n
export interface TranslationResources {
  common: {
    loading: string;
    error: string;
    success: string;
  };
  languageSwitcher: {
    title: string;
    selectLanguage: string;
    tooltip: string;
    languages: {
      ru: string;
      en: string;
      he: string;
    };
  };
  navigation: {
    words: string;
    dialogs: string;
    statistics: string;
    settings: string;
  };
  demo: {
    welcome: string;
    description: string;
    currentLanguage: string;
    rtlTest: string;
  };
}

// Supported languages
export type SupportedLanguage = 'ru' | 'en' | 'he';

// Language configuration
export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

// Available languages configuration
export const LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    isRTL: false,
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isRTL: false,
  },
  he: {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    isRTL: true,
  },
};

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ru';

// RTL languages list
export const RTL_LANGUAGES: SupportedLanguage[] = ['he'];

// Type augmentation for react-i18next
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationResources;
    };
  }
}