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
}

export interface WordsState {
  words: Word[];
  currentIndex: number;
}