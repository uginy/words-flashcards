// Zustand store for managing words with full business logic and localStorage sync

import { create } from 'zustand';
import type { Word, WordsState } from '../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';

const initialState: WordsState = {
  words: [],
  currentIndex: 0,
};

// Returns statistics for a given array of words
export function getStats(words: Word[]) {
  const total = words.length;
  const learned = words.filter(word => word.isLearned).length;
  const needReview = words.filter(word => {
    // Слова, которые помечены как изученные и срок их повторения истек или не указан
    return word.isLearned && 
           (word.nextReview === undefined || 
            word.nextReview === null || 
            word.nextReview <= Date.now());
  }).length;
  
  // Статистика по уровням знания
  const learningStages = {
    stage1: words.filter(word => word.learningStage === 1).length,
    stage2: words.filter(word => word.learningStage === 2).length,
    stage3: words.filter(word => word.learningStage === 3).length,
    stage4: words.filter(word => word.learningStage === 4).length,
    stage5: words.filter(word => word.learningStage === 5).length,
  };
  
  return {
    total,
    learned,
    remaining: total - learned,
    needReview,
    learningStages
  };
}
type ToastFn = (opts: { title: string; description: string; variant?: string }) => void;

interface WordsStore extends WordsState {
  addWords: (newWords: Word[], toast: ToastFn) => Promise<void>;
  markAsLearned: (id: string, toast?: ToastFn) => void;
  markAsNotLearned: (id: string, toast?: ToastFn) => void;
  toggleTranslation: (id: string) => void;
  nextWord: (toast?: ToastFn) => void;
  resetProgress: () => void;
  deleteWord: (id: string, toast?: ToastFn) => void;
  updateWord: (updatedWord: Word) => void;
  updateWords: (words: Word[] | null) => void;
  replaceAllWords: (newWords: Word[], toast?: ToastFn) => void;
  clearAllWords: (toast?: ToastFn) => void;
  // currentWord removed; use getCurrentWord(words, currentIndex) instead
}

export const useWordsStore = create<WordsStore>((set, get) => {
  // Load from localStorage on init
  const savedState = loadFromLocalStorage();
  const state: WordsState = savedState
    ? {
        words: savedState.words || [],
        currentIndex: savedState.currentIndex || 0,
      }
    : initialState;

  // Sync with localStorage changes from other tabs/windows
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key === 'hebrew-flashcards-data') {
        const saved = loadFromLocalStorage();
        set(
          saved
            ? {
                words: saved.words || [],
                currentIndex: saved.currentIndex || 0,
              }
            : initialState
        );
      }
    });
  }

  return {
    ...state,

    addWords: async (newWords, toast) => {
      try {
        const initialValidWords = newWords.filter(word => word.hebrew && word.russian);
        const validNewWords = initialValidWords.filter(
          (word, index, self) =>
            self.findIndex(w => w.hebrew === word.hebrew && w.russian === word.russian) === index
        );
        if (validNewWords.length < initialValidWords.length && toast) {
          const dupCount = initialValidWords.length - validNewWords.length;
          toast({
            title: 'Информация',
            description: `Пропущено ${dupCount} дублирующих слов во вводе`,
          });
        }
        if (validNewWords.length === 0) {
          toast?.({
            title: 'Ошибка',
            description: 'Нет валидных слов для добавления.',
            variant: 'destructive',
          });
          return;
        }
        set(state => {
          if (state.words.length === 0) {
            return { ...state, words: validNewWords, currentIndex: 0 };
          }
          const uniqueNewWords = validNewWords.filter(
            newWord =>
              !state.words.some(
                existingWord =>
                  existingWord.hebrew === newWord.hebrew && existingWord.russian === newWord.russian
              )
          );
          if (uniqueNewWords.length === 0) {
            toast?.({
              title: 'Ошибка',
              description: 'Эти слова уже существуют в вашей коллекции.',
              variant: 'destructive',
            });
            return state;
          }
          const count = uniqueNewWords.length;
          const wordForm =
            count === 1 ? 'слово' : count >= 2 && count <= 4 ? 'слова' : 'слов';
          toast?.({
            title: 'Успех!',
            description: `Добавлено ${count} ${wordForm}`,
          });
          return { ...state, words: [...state.words, ...uniqueNewWords] };
        });
      } catch (error: any) {
        toast?.({
          title: 'Ошибка',
          description: error?.message || 'Failed to add words',
          variant: 'destructive',
        });
      }
    },

    markAsLearned: (id) => {
      set(state => {
        const newWords = state.words.map(word => {
          if (word.id === id) {
            const currentStage = word.learningStage || 0;
            const newStage = Math.min(currentStage + 1, 5); // Максимальный уровень знания - 5
            const now = Date.now();
            
            // Расчет следующего времени повторения на основе уровня знания
            // Чем выше уровень, тем дольше интервал до следующего повторения
            let nextReview: number | null = now;
            switch (newStage) {
              case 1: nextReview = now + 1 * 24 * 60 * 60 * 1000; break; // 1 день
              case 2: nextReview = now + 3 * 24 * 60 * 60 * 1000; break; // 3 дня
              case 3: nextReview = now + 7 * 24 * 60 * 60 * 1000; break; // 7 дней
              case 4: nextReview = now + 14 * 24 * 60 * 60 * 1000; break; // 14 дней
              case 5: nextReview = now + 30 * 24 * 60 * 60 * 1000; break; // 30 дней
              default: nextReview = null;
            }

            return { 
              ...word, 
              isLearned: true,
              learningStage: newStage,
              lastReviewed: now,
              nextReview
            };
          }
          return word;
        });
        return { ...state, words: newWords };
      });
    },

    markAsNotLearned: (id) => {
      set(state => {
        const newWords = state.words.map(word =>
          word.id === id
            ? { ...word, isLearned: false, learningStage: 0 }
            : word
        );
        return { ...state, words: newWords };
      });
    },

    toggleTranslation: id => {
      set(state => ({
        ...state,
        words: state.words.map(word =>
          word.id === id ? { ...word, showTranslation: !word.showTranslation } : word
        ),
      }));
    },

    nextWord: () => {
      set(state => {
        // Debug log before change

        if (state.words.length === 0) {
          return state;
        }

        // Если все слова изучены, не переходим
        const allLearned = state.words.length > 0 && state.words.every(word => word.isLearned);
        if (allLearned) {
          return state;
        }

        let newIndex = state.currentIndex;

        // Циклический переход по кругу
        if (state.currentIndex + 1 >= state.words.length) {
          newIndex = 0;
        } else {
          newIndex = state.currentIndex + 1;
        }

        const wordsWithHiddenTranslation = state.words.map((word, idx) =>
          idx === newIndex ? { ...word, showTranslation: false } : word
        );

        return {
          ...state,
          words: wordsWithHiddenTranslation,
          currentIndex: newIndex,
        };
      });
    },

    resetProgress: () => {
      set(state => ({
        ...state,
        words: state.words.map(word => ({
          ...word,
          isLearned: false,
          showTranslation: false,
          learningStage: 0,
          lastReviewed: null,
          nextReview: null,
        })),
        currentIndex: state.words.length > 0 ? 0 : 0,
      }));
    },

    deleteWord: (id) => {
      set(state => {
        const updatedWords = state.words.filter(word => word.id !== id);
        let newCurrentIndex = state.currentIndex;
        if (newCurrentIndex >= updatedWords.length) {
          newCurrentIndex = Math.max(0, updatedWords.length - 1);
        }
        return {
          ...state,
          words: updatedWords,
          currentIndex: newCurrentIndex,
        };
      });
    },

    updateWord: updatedWord => {
      set(state => ({
        ...state,
        words: state.words.map(word => (word.id === updatedWord.id ? updatedWord : word)),
      }));
    },

    updateWords: words => {
      if (words) {
        set({
          words,
          currentIndex: 0,
        });
      } else {
        set(initialState);
      }
    },

    replaceAllWords: (newWords, toast) => {
      set(() => {
        const newCurrentIndex = newWords.length > 0 ? 0 : 0;
        if (newWords.length === 0) {
          toast?.({
            title: 'Успех!',
            description: 'Список слов очищен.',
          });
        }
        return {
          words: newWords,
          currentIndex: newCurrentIndex,
        };
      });
    },

    /**
     * Clears all words and resets all related state,
     * including currentWord, currentIndex, and progress.
     */
    clearAllWords: toast => {
      set({ ...initialState });
      toast?.({
        title: 'Успех!',
        description: 'Все слова удалены из коллекции',
      });
    },

    // stats getter removed; use getStats(words) instead

    // currentWord getter removed; use getCurrentWord(words, currentIndex) instead
  };
});

// Returns the current word based on words array and currentIndex
export function getCurrentWord(words: Word[], currentIndex: number): Word | undefined {
  if (words.length === 0) return undefined;
  if (currentIndex < words.length && words[currentIndex] !== undefined) return words[currentIndex];
  // If currentIndex is out of bounds, fallback to first word (should not happen with current logic)
  return words[0];
}

// Auto-save to localStorage on every change
useWordsStore.subscribe(state => {
  if (state.words.length > 0 || state.currentIndex !== 0) {
    saveToLocalStorage({ words: state.words, currentIndex: state.currentIndex });
  }
});