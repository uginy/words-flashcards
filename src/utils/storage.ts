import { WordsState } from '../types';

const STORAGE_KEY = 'hebrew-flashcards-data';

export const saveToLocalStorage = (state: WordsState): void => {
  try {
    if (state.words.length === 0) {
      // If clearing the words list, remove the entire storage
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): WordsState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};