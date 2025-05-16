export type WordCategory = 'שם עצם' | 'פועל' | 'שם תואר' | 'אחר';

export interface Word {
  id: string;
  hebrew: string;
  russian: string;
  transcription: string;
  category: WordCategory;
  conjugations?: {
    past?: { [key: string]: string }; 
    present?: { [key: string]: string };
    future?: { [key: string]: string };
    imperative?: { [key: string]: string };
  };
  examples?: { hebrew: string; russian: string }[];
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