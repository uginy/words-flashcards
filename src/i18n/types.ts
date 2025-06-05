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
  tabs: {
    learn: string;
    add: string;
    list: string;
    dialogs: string;
    languages: string;
    settings: string;
  };
  filters: {
    category: string;
    status: string;
    selectCategory: string;
    selectStatus: string;
    allCategories: string;
    all: string;
    learned: string;
    notLearned: string;
    reverseMode: string;
  };
  actions: {
    know: string;
    next: string;
    previous: string;
    resetLevel: string;
    resetProgress: string;
    addNewWords: string;
    addWords: string;
  };
  status: {
    learned: string;
    notLearned: string;
    learningLevel: string;
    examples: string;
    conjugations: string;
    translateToHebrew: string;
    clickToSeeAnswer: string;
    clickToSeeTranslation: string;
    resetProgressTooltip: string;
  };
  messages: {
    congratulations: string;
    allWordsLearned: string;
    emptyWordList: string;
    addWordsToStart: string;
  };
  wordTable: {
    title: string;
    exportTooltip: string;
    importTooltip: string;
    clearAllTooltip: string;
    searchHebrew: string;
    searchRussian: string;
    categories: string;
    statusFilter: string;
    levelFilter: string;
    deleteAllTitle: string;
    deleteAllDescription: string;
    wordUpdated: string;
    noWordsToExport: string;
    fileReadError: string;
    invalidFileFormat: string;
    jsonParseError: string;
    importSuccess: string;
    allWordsDeleted: string;
    categoryLabels: {
      verb: string;
      noun: string;
      adjective: string;
      phrase: string;
    };
    levelLabels: {
      level5: string;
      level4: string;
      level3: string;
      level2: string;
      level1: string;
      notStarted: string;
    };
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