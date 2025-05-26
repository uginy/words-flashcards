export type WordCategory = 'שם עצם' | 'פועל' | 'שם תואר' | 'פרזות' | 'אחר';

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

export interface WordsState {
  words: Word[];
  currentIndex: number;
}