export type WordCategory = 'שם עצם' | 'פועל' | 'שם תואר' | 'פרזות' | 'אחר' | 'דיאלוג';

export interface Word {
  id: string;
  hebrew: string;
  russian: string;
  transcription: string;
  category: WordCategory;
  conjugations?: {
    past?: { [pronoun: string]: string } | null;
    present?: { [pronoun: string]: string } | null;
    future?: { [pronoun: string]: string } | null;
    imperative?: { [pronoun: string]: string } | null;
  } | null;
  examples?: { hebrew: string; russian: string }[] | null; // Allow null for examples
  isLearned: boolean;
  dateAdded: number;
  showTranslation?: boolean;
  learningStage?: number;
  lastReviewed?: number | null;
  nextReview?: number | null;
}

export interface BackgroundTask {
  id: string;
  type: 'addWords' | 'generateDialog';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  totalItems?: number;
  processedItems?: number;
  added?: number;
  skipped?: number;
  failed?: number;
  words?: string[];
  result?: Word[] | Dialog;
  failedWords?: string[];
  error?: string;
  createdAt: number;
  cancelled?: boolean;
  abortController?: AbortController;
  // Dialog-specific fields
  settings?: DialogGenerationSettings;
}

export interface WordsState {
  words: Word[];
  currentIndex: number;
}

// Dialog types
export type DialogLevel = 'אלף' | 'בית' | 'גימל' | 'דלת' | 'הא';
export type ParticipantGender = 'male' | 'female';
export type DialogStatus = 'new' | 'learning' | 'reviewing' | 'learned';

export interface DialogParticipant {
  id: string;
  name: string;
  gender: ParticipantGender;
  avatar?: string; // SVG string or base64 image data
  voiceSettings?: {
    pitch: number;
    rate: number;
    volume: number;
  };
}

export interface DialogCard {
  id: string;
  hebrew: string;
  russian: string;
  speaker: string; // ID участника
  order: number;
}

export interface Dialog {
  id: string;
  title: string; // тема диалога на иврите
  titleRu: string; // перевод темы на русский
  level: DialogLevel;
  participants: DialogParticipant[];
  cards: DialogCard[];
  isLearned: boolean;
  learningStage: number; // 0-5, как у слов
  dateAdded: number;
  lastReviewed?: number | null;
  nextReview?: number | null;
  showTranslation?: boolean;
  usedWords?: string[]; // слова из пользовательской коллекции
  newWords?: Word[]; // новые слова, добавленные с диалогом
}

export interface DialogGenerationSettings {
  level: DialogLevel;
  participantCount: 2 | 3;
  participants: DialogParticipant[];
  useExistingWords: boolean;
  includeNewWords: boolean;
  wordsToUse?: string[]; // конкретные слова для включения
  topic?: string; // опциональная тема
}

export interface DialogBackgroundTask {
  id: string;
  type: 'generateDialog';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  settings: DialogGenerationSettings;
  result?: Dialog;
  error?: string;
  createdAt: number;
  cancelled?: boolean;
  abortController?: AbortController;
}

export interface DialogStats {
  total: number;
  learned: number;
  remaining: number;
  needReview: number;
  levelDistribution: Record<DialogLevel, number>;
}

export interface DialogsState {
  dialogs: Dialog[];
  currentDialogIndex: number;
  backgroundTasks: DialogBackgroundTask[];
  isBackgroundProcessing: boolean;
  generationSettings: DialogGenerationSettings | null;
}

// Re-export detailed dialog types from dialogs.ts
export type {
  BackgroundTaskBase,
  ToastFunction,
  RetryConfig,
  DialogPlaybackState,
  DialogLearningProgress,
  DialogSessionData,
  DialogFilter,
  DialogSortOptions,
  VoicePreferences,
  TTSQueueItem,
  DialogGenerationContext,
  DialogValidationResult,
  DialogGenerationResult,
  DialogCardWithMetadata,
  DialogWithProgress,
  DialogAPIResponse,
  DialogExportData,
  DialogImportOptions
} from './dialogs';