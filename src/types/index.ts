export type WordCategory = 'noun' | 'verb' | 'adjective' | 'other';

export interface Word {
  id: string;
  hebrew: string;
  russian: string;
  transcription: string;
  category: WordCategory;
  conjugation?: string;
  example?: string; // Added for usage examples
  learned: boolean;
  dateAdded: number;
  showTranslation?: boolean; // Optional: to control visibility on the card
  isLearned?: boolean; // More explicit than 'learned' perhaps, or can consolidate
  learningStage?: number; // For spaced repetition logic
  lastReviewed?: number | null; // Timestamp of last review
  nextReview?: number | null;   // Timestamp for next scheduled review
}

export interface WordsState {
  words: Word[];
  currentIndex: number;
}