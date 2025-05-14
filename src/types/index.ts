export type WordCategory = 'שם עצם' | 'פועל' | 'שם תואר' | 'אחר';  // существительное | глагол | прилагательное | другое

export interface Word {
  id: string;
  hebrew: string;
  russian: string;
  transcription: string;
  category: WordCategory;
  conjugations?: {
    past?: { [key: string]: string };     // прошедшее время
    present?: { [key: string]: string };  // настоящее время
    future?: { [key: string]: string };   // будущее время
    imperative?: { [key: string]: string }; // повелительное наклонение
  };
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