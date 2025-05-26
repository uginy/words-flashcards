// Zustand store for managing words with full business logic and localStorage sync

import { create } from 'zustand';
import type { Word, WordsState } from '../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import { parseAndTranslateWords } from '../utils/translation';
import { enrichWordsWithLLM } from '../services/openrouter';
import { translateToHebrew } from '../services/translation';
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';

const initialState: WordsState = {
  words: [],
  currentIndex: 0,
};

const initialStoreState = {
  ...initialState,
  backgroundTasks: [] as BackgroundTask[],
  isBackgroundProcessing: false,
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

// Helper function to chunk arrays
function chunkArray<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

// Validation function for LLM response
interface LLMResponseWord {
  hebrew: string;
  russian: string;
  transcription: string;
  category: string;
}

function validateLLMWordsResponse(data: unknown): Word[] {
  if (Array.isArray(data)) {
    return data.filter((w: unknown): w is LLMResponseWord =>
      w !== null &&
      typeof w === 'object' &&
      typeof (w as LLMResponseWord).hebrew === 'string' &&
      typeof (w as LLMResponseWord).russian === 'string' &&
      typeof (w as LLMResponseWord).transcription === 'string' &&
      typeof (w as LLMResponseWord).category === 'string'
    ) as Word[];
  }
  if (!data || typeof data !== 'object' || !Array.isArray((data as { words?: unknown[] }).words)) return [];
  return (data as { words: unknown[] }).words.filter((w: unknown): w is LLMResponseWord =>
    w !== null &&
    typeof w === 'object' &&
    typeof (w as LLMResponseWord).hebrew === 'string' &&
    typeof (w as LLMResponseWord).russian === 'string' &&
    typeof (w as LLMResponseWord).transcription === 'string' &&
    typeof (w as LLMResponseWord).category === 'string'
  ) as Word[];
}

// Background processing function
async function processWordsInBackground(
  taskId: string,
  inputText: string,
  toast: ToastFn,
  set: (partial: Partial<WordsStore> | ((state: WordsStore) => Partial<WordsStore>)) => void,
  get: () => WordsStore
) {
  try {
    // Update task status to running
    set((state: WordsStore) => ({
      ...state,
      backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
        task.id === taskId ? { ...task, status: 'running' as const } : task
      )
    }));

    const apiKey = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY;
    const model = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL;
    
    if (!apiKey || !model || apiKey === "YOUR_DEFAULT_API_KEY_HERE" || model === "YOUR_DEFAULT_MODEL_ID_HERE") {
      throw new Error('OpenRouter API key or model не настроены');
    }

    const existingWords = get().words;

    if (inputText.includes(' - ')) {
      // Structured input - process immediately and complete task
      try {
        const structuredWords = parseAndTranslateWords(inputText);
        
        // Add words to store
        set((state: WordsStore) => ({
          ...state,
          words: [...state.words, ...structuredWords]
        }));

        // Mark task as completed
        set((state: WordsStore) => ({
          ...state,
          backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
            task.id === taskId ? {
              ...task,
              status: 'completed' as const,
              progress: 100,
              result: structuredWords
            } : task
          )
        }));
        
        return;
      } catch {
        throw new Error('Failed to parse the input text');
      }
    } else {
      // Split and clean input
      const wordsToTranslate = inputText
        .split(/\r\n|\r|\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (wordsToTranslate.length === 0) {
        throw new Error('Нет слов для добавления');
      }

      // Update task with word count
      set((state: WordsStore) => ({
        ...state,
        backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
          task.id === taskId ? {
            ...task,
            totalItems: wordsToTranslate.length,
            words: wordsToTranslate
          } : task
        )
      }));

      // Check if input is in Russian
      const containsCyrillic = /[а-яА-ЯёЁ]/.test(inputText);

      if (containsCyrillic) {
        // Translate Russian words to Hebrew
        toast({
          title: "Фоновая обработка",
          description: "Переводим слова на иврит...",
        });

        const formattedInput = wordsToTranslate.join('\n');
        const translations = await translateToHebrew(formattedInput, apiKey, model);
        
        // Update the words list with translations
        const translatedWords = translations
          .map(translation => translation.split(',').map(t => t.trim()))
          .flat();

        // Update task progress
        set((state: WordsStore) => ({
          ...state,
          backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
            task.id === taskId ? {
              ...task,
              words: translatedWords,
              totalItems: translatedWords.length,
              progress: 25
            } : task
          )
        }));

        // Continue processing with Hebrew words
        await processHebrewWords(taskId, translatedWords, existingWords, apiKey, model, toast, set);
      } else {
        // Process Hebrew words directly
        await processHebrewWords(taskId, wordsToTranslate, existingWords, apiKey, model, toast, set);
      }
    }

    // Mark task as completed
    set((state: WordsStore) => ({
      ...state,
      backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
        task.id === taskId ? {
          ...task,
          status: 'completed' as const,
          progress: 100
        } : task
      ),
      isBackgroundProcessing: !state.backgroundTasks.every((task: BackgroundTask) =>
        task.id === taskId || task.status === 'completed' || task.status === 'error'
      )
    }));

    toast({
      title: 'Фоновая обработка завершена!',
      description: 'Слова успешно добавлены в коллекцию',
      variant: 'success',
    });

  } catch (error) {
    // Mark task as failed
    set((state: WordsStore) => ({
      ...state,
      backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
        task.id === taskId ? {
          ...task,
          status: 'error' as const,
          error: error instanceof Error ? error.message : String(error)
        } : task
      ),
      isBackgroundProcessing: !state.backgroundTasks.every((task: BackgroundTask) =>
        task.id === taskId || task.status === 'completed' || task.status === 'error'
      )
    }));

    toast({
      title: 'Ошибка фоновой обработки',
      description: error instanceof Error ? error.message : String(error),
      variant: 'error',
    });
  }
}

async function processHebrewWords(
  taskId: string,
  hebrewWords: string[],
  existingWords: Word[],
  apiKey: string,
  model: string,
  toast: ToastFn,
  set: (partial: Partial<WordsStore> | ((state: WordsStore) => Partial<WordsStore>)) => void
) {
  // Filter unique words
  const uniqueWords = hebrewWords.filter(newWord =>
    !existingWords.some(existingWord => existingWord.hebrew === newWord)
  );

  if (uniqueWords.length === 0) {
    throw new Error('Все указанные слова уже существуют в вашей коллекции');
  }

  // Process in chunks
  const chunkSize = 5;
  const chunks = chunkArray(uniqueWords, chunkSize);
  let allValidWords: Word[] = [];
  let processedCount = 0;

  for (const chunk of chunks) {
    try {
      const result = await enrichWordsWithLLM(chunk, apiKey, model);
      const valid = validateLLMWordsResponse(result);
      
      if (valid.length > 0) {
        allValidWords = allValidWords.concat(valid);
        
        // Add words to store immediately
        set((state: WordsStore) => ({
          ...state,
          words: [...state.words, ...valid]
        }));
      }

      processedCount += chunk.length;
      
      // Update progress
      set((state: WordsStore) => ({
        ...state,
        backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
          task.id === taskId ? {
            ...task,
            processedItems: processedCount,
            progress: Math.round((processedCount / uniqueWords.length) * 100),
            result: allValidWords
          } : task
        )
      }));

    } catch (err) {
      console.error('Ошибка при обработке чанка:', chunk, err);
      // Continue with next chunk
      processedCount += chunk.length;
    }
  }
}

interface BackgroundTask {
  id: string;
  type: 'addWords';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  totalItems: number;
  processedItems: number;
  words?: string[];
  result?: Word[];
  error?: string;
  createdAt: number;
}

interface WordsStore extends WordsState {
  // Background tasks state
  backgroundTasks: BackgroundTask[];
  isBackgroundProcessing: boolean;
  
  // Methods
  addWords: (newWords: Word[], toast: ToastFn) => Promise<void>;
  startBackgroundWordProcessing: (inputText: string, toast: ToastFn) => Promise<string>; // returns task id
  getBackgroundTask: (taskId: string) => BackgroundTask | undefined;
  clearCompletedTasks: () => void;
  markAsLearned: (id: string, toast?: ToastFn) => void;
  markAsNotLearned: (id: string, toast?: ToastFn) => void;
  toggleTranslation: (id: string) => void;
  nextWord: (toast?: ToastFn) => void;
  resetProgress: () => void;
  resetWordProgress: (id: string, toast?: ToastFn) => void; // Новый метод для сброса прогресса отдельного слова
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
  const state = savedState
    ? {
        words: savedState.words || [],
        currentIndex: savedState.currentIndex || 0,
        backgroundTasks: [] as BackgroundTask[],
        isBackgroundProcessing: false,
      }
    : initialStoreState;

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
      } catch (error: unknown) {
        toast?.({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Failed to add words',
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
    
    // Сброс прогресса обучения для конкретного слова
    resetWordProgress: (id, toast) => {
      set(state => {
        const updatedWords = state.words.map(word => 
          word.id === id ? {
            ...word,
            learningStage: 0,
            lastReviewed: null,
            nextReview: null,
            // Оставляем isLearned без изменений, чтобы не влиять на основную статистику
          } : word  
        );
        
        toast?.({
          title: 'Успех!',
          description: 'Прогресс изучения слова сброшен',
        });
        
        return {
          ...state,
          words: updatedWords,
        };
      });
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

    // Background processing methods
    startBackgroundWordProcessing: async (inputText: string, toast: ToastFn) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new task
      const newTask: BackgroundTask = {
        id: taskId,
        type: 'addWords',
        status: 'pending',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
        words: [],
        createdAt: Date.now()
      };

      // Add task to state
      set(state => ({
        ...state,
        backgroundTasks: [...state.backgroundTasks, newTask],
        isBackgroundProcessing: true
      }));

      // Start processing in background
      processWordsInBackground(taskId, inputText, toast, set, get);
      
      return taskId;
    },

    getBackgroundTask: (taskId: string) => {
      const state = get();
      return state.backgroundTasks.find(task => task.id === taskId);
    },

    clearCompletedTasks: () => {
      set(state => ({
        ...state,
        backgroundTasks: state.backgroundTasks.filter(task =>
          task.status === 'running' || task.status === 'pending'
        ),
        isBackgroundProcessing: state.backgroundTasks.some(task =>
          task.status === 'running' || task.status === 'pending'
        )
      }));
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