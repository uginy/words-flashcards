import type { Word, DialogLevel, DialogCard, Dialog } from './index';

// Base types for common functionality
export interface BackgroundTaskBase {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  createdAt: number;
  cancelled?: boolean;
  abortController?: AbortController;
  error?: string;
}

export type ToastFunction = (opts: {
  title: string;
  description: string;
  variant?: 'success' | 'error' | 'info';
}) => void;

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Dialog-specific types
export interface DialogPlaybackState {
  isPlaying: boolean;
  currentCardIndex: number;
  autoPlay: boolean;
  playbackSpeed: number;
  repeatCard: boolean;
}

export interface DialogLearningProgress {
  cardsCompleted: number;
  totalCards: number;
  mistakeCount: number;
  correctAnswers: number;
  averageResponseTime: number;
  difficultyRating?: 1 | 2 | 3 | 4 | 5;
}

export interface DialogSessionData {
  dialogId: string;
  startTime: number;
  endTime?: number;
  progress: DialogLearningProgress;
  playbackState: DialogPlaybackState;
  notes?: string;
}

export interface DialogFilter {
  level?: DialogLevel;
  isLearned?: boolean;
  needsReview?: boolean;
  search?: string;
  dateRange?: {
    from: number;
    to: number;
  };
}

export interface DialogSortOptions {
  field: 'dateAdded' | 'lastReviewed' | 'title' | 'level' | 'learningStage';
  direction: 'asc' | 'desc';
}

// Voice and TTS related types
export interface VoicePreferences {
  preferredVoices: {
    male: string;
    female: string;
  };
  globalSettings: {
    pitch: number;
    rate: number;
    volume: number;
  };
  useSystemVoices: boolean;
}

export interface TTSQueueItem {
  id: string;
  text: string;
  voice: SpeechSynthesisVoice | null;
  settings: {
    pitch: number;
    rate: number;
    volume: number;
  };
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

// Generation related types
export interface DialogGenerationContext {
  existingWords: Word[];
  userLevel: DialogLevel;
  previousDialogs: Dialog[];
  preferredTopics?: string[];
  avoidWords?: string[];
}

export interface DialogValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface DialogGenerationResult {
  dialog: Dialog;
  metadata: {
    wordsUsed: string[];
    newWordsCreated: Word[];
    generationTime: number;
    modelUsed: string;
    promptTokens: number;
    completionTokens: number;
  };
}

// Export commonly used utility types
export interface DialogCardWithMetadata extends DialogCard {
  isCurrentCard?: boolean;
  hasBeenPlayed?: boolean;
  difficultyScore?: number;
  userRating?: 1 | 2 | 3 | 4 | 5;
}

export interface DialogWithProgress extends Dialog {
  sessionData?: DialogSessionData;
  completionPercentage: number;
  estimatedTimeToComplete?: number;
  recommendedNext?: string; // ID следующего рекомендуемого диалога
}

// API and service types
export interface DialogAPIResponse {
  success: boolean;
  data?: Dialog;
  error?: string;
  metadata?: {
    requestId: string;
    processingTime: number;
  };
}

export interface DialogExportData {
  version: string;
  exportDate: number;
  dialogs: Dialog[];
  metadata: {
    totalDialogs: number;
    levelDistribution: Record<DialogLevel, number>;
    exportedBy: string;
  };
}

export interface DialogImportOptions {
  mergeMode: 'replace' | 'append' | 'update';
  preserveProgress: boolean;
  validateIntegrity: boolean;
  createBackup: boolean;
}