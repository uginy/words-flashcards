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
  settings: {
    title: string;
    tableSettings: string;
    recordsPerPage: string;
    recordsPerPagePlaceholder: string;
    recordsText: string;
    llmSettings: string;
    apiKeyLabel: string;
    apiKeyHint: string;
    modelSelectLabel: string;
    searchModelPlaceholder: string;
    noModelsFound: string;
    refreshButton: string;
    refreshingButton: string;
    showFreeOnlyLabel: string;
    noModelsError: string;
    saveButton: string;
    settingsSaved: string;
    settingsSavedDescription: string;
    modelsFetchError: string;
    modelsFetchErrorDesc: string;
    costWarning: string;
  };
  wordInput: {
    title: string;
    importedWordsDetected: string;
    importWordsButton: string;
    instructions: string;
    backgroundProcessingInfo: string;
    placeholder: string;
    useSampleButton: string;
    clearButton: string;
    addWordsButton: string;
    apiNotConfigured: string;
    processingError: string;
    importSuccess: string;
    importSuccessDescription: string;
    errorTitle: string;
  };
  dialogs: {
    generateTitle: string;
    generateButton: string;
    generatingButton: string;
    noWordsAvailable: string;
    addWordsFirst: string;
    generationError: string;
    dialogsListTitle: string;
    noDialogsAvailable: string;
    startGenerating: string;
    deleteDialogTitle: string;
    deleteDialogDescription: string;
    deleteButton: string;
    cancelButton: string;
    dialogDeleted: string;
    participantsNotConfigured: string;
    participantNamesRequired: string;
    difficultyLevel: string;
    participantCount: string;
    participants: string;
    dialogParticipants: string;
    participantName: string;
  };
  statistics: {
    title: string;
    totalWords: string;
    learnedWords: string;
    learningProgress: string;
    averageLevel: string;
    categoryBreakdown: string;
    levelDistribution: string;
    noDataAvailable: string;
    remainingWords: string;
    needReview: string;
  };
  conjugation: {
    title: string;
    editTitle: string;
    addTitle: string;
    pronounLabel: string;
    formLabel: string;
    addConjugationButton: string;
    saveButton: string;
    cancelButton: string;
    deleteButton: string;
    conjugationSaved: string;
    conjugationDeleted: string;
    validation: {
      pronounRequired: string;
      formRequired: string;
    };
  };
  examples: {
    title: string;
    editTitle: string;
    addTitle: string;
    hebrewLabel: string;
    russianLabel: string;
    addExampleButton: string;
    saveButton: string;
    cancelButton: string;
    deleteButton: string;
    exampleSaved: string;
    exampleDeleted: string;
    validation: {
      hebrewRequired: string;
      russianRequired: string;
    };
  };
  suggestions: {
    generateSuggestions: string;
    generating: string;
    noSuggestions: string;
    error: string;
    selectCategory: string;
    categories: {
      verb: string;
      noun: string;
      adjective: string;
      phrase: string;
      mixed: string;
    };
  };
  confirmations: {
    deleteWord: string;
    deleteWordDescription: string;
    resetProgress: string;
    resetProgressDescription: string;
    clearAllWords: string;
    clearAllWordsDescription: string;
    confirmButton: string;
    cancelButton: string;
  };
  editWord: {
    title: string;
    hebrewLabel: string;
    russianLabel: string;
    categoryLabel: string;
    saveButton: string;
    cancelButton: string;
    wordSaved: string;
    validation: {
      hebrewRequired: string;
      russianRequired: string;
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
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

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