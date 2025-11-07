import { WordsState, Word } from '../types';

const STORAGE_KEY = 'hebrew-flashcards-data';

const stripImageDataUrl = (word: Word): Word => {
  if (word.image?.dataUrl) {
    const { dataUrl, ...restImage } = word.image;
    return {
      ...word,
      image: restImage,
    };
  }
  return word;
};

export const saveToLocalStorage = (state: WordsState): void => {
  try {
    if (state.words.length === 0) {
      // If clearing the words list, remove the entire storage
      localStorage.removeItem(STORAGE_KEY);
    } else {
      const sanitizedWords = state.words.map(stripImageDataUrl);
      const sanitizedState: WordsState = {
        ...state,
        words: sanitizedWords,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedState));
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
