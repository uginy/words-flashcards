// Zustand store for managing words with full business logic and localStorage sync

import { create } from 'zustand';
import type { Word, WordsState, BackgroundTask } from '../types';
import type { ImageGenerationStatus } from '../types/imageGeneration';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import { parseAndTranslateWords } from '../utils/translation';
import { enrichWordsWithLLM, refineWordWithLLM, translateToHebrew } from '../services/openrouter';
import { loadLLMSettings, type LLMSettings } from '../config/llm-settings';
import { loadImageSettings } from '../config/image-generation';
import { generateWordImageAsset } from '../services/imageGeneration';
import { saveWordImageData, loadWordImageData, deleteWordImageData, clearAllWordImages } from '../utils/imageStorage';

const initialState: WordsState = {
  words: [],
  currentIndex: 0,
};

const initialStoreState = {
  ...initialState,
  backgroundTasks: [] as BackgroundTask[],
  isBackgroundProcessing: false,
  draftInputText: '',
  refiningWords: new Set<string>(),
  imageGenerationStatus: {} as Record<string, ImageGenerationStatus>,
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

async function hydrateImagesFromStorage(
  words: Word[],
  set: (updater: (state: WordsStore) => Partial<WordsStore>) => void
) {
  try {
    const hydratedWords = await Promise.all(
      words.map(async (word) => {
        if (word.image?.storageKey && !word.image.dataUrl) {
          const dataUrl = await loadWordImageData(word.image.storageKey);
          if (dataUrl) {
            return {
              ...word,
              image: {
                ...word.image,
                dataUrl,
              },
            };
          }
        }
        return word;
      })
    );

    set((state) => ({
      ...state,
      words: hydratedWords,
    }));
  } catch (error) {
    console.error('Не удалось загрузить изображения из IndexedDB', error);
  }
}

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


// Validation function for LLM response - moved from WordInput.tsx
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

// Background processing function with enhanced statistics and error handling
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


    // Load current LLM settings
    const llmSettings = loadLLMSettings();
    
    if (llmSettings.provider === 'openrouter') {
      if (!llmSettings.openrouter.apiKey || !llmSettings.openrouter.selectedModel) {
        throw new Error('OpenRouter не настроен. Укажите API ключ и модель в настройках.');
      }
    } else if (llmSettings.provider === 'ollama') {
      if (!llmSettings.ollama.apiUrl || !llmSettings.ollama.selectedModel) {
        throw new Error('Ollama не настроен. Укажите URL и модель в настройках.');
      }
    } else if (llmSettings.provider === 'lmstudio') {
      if (!llmSettings.lmstudio.apiUrl || !llmSettings.lmstudio.selectedModel) {
        throw new Error('LM Studio не настроен. Укажите URL и модель в настройках.');
      }
    } else {
      throw new Error('Не выбран провайдер ИИ в настройках.');
    }

    const existingWords = get().words;

    // Check if task was cancelled
    const currentState = get();
    const task = currentState.backgroundTasks.find(t => t.id === taskId);
    if (task?.cancelled) {
      return;
    }

    if (inputText.includes(' - ')) {
      // Structured input - process immediately and complete task
      try {
        const structuredWords = parseAndTranslateWords(inputText);
        
        // Filter out duplicates
        const uniqueStructuredWords = structuredWords.filter(newWord =>
          !existingWords.some(existingWord =>
            existingWord.hebrew === newWord.hebrew && existingWord.russian === newWord.russian
          )
        );

        const skippedCount = structuredWords.length - uniqueStructuredWords.length;
        
        // Add words to store
        set((state: WordsStore) => ({
          ...state,
          words: [...state.words, ...uniqueStructuredWords]
        }));

        // Mark task as completed with statistics
        set((state: WordsStore) => ({
          ...state,
          backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
            task.id === taskId ? {
              ...task,
              status: 'completed' as const,
              progress: 100,
              added: uniqueStructuredWords.length,
              skipped: skippedCount,
              failed: 0,
              totalItems: structuredWords.length,
              processedItems: structuredWords.length,
              result: uniqueStructuredWords,
              failedWords: []
            } : task
          )
        }));
        
        // Show detailed completion message
        const message = uniqueStructuredWords.length > 0
          ? `Добавлено: ${uniqueStructuredWords.length}, пропущено: ${skippedCount}`
          : `Все ${structuredWords.length} слов уже существуют в коллекции`;
          
        toast({
          title: 'Фоновая обработка завершена!',
          description: message,
          variant: uniqueStructuredWords.length > 0 ? 'success' : 'info',
        });
        
        return;
      } catch {
        throw new Error('Не удалось обработать структурированный ввод');
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
        const translations = await translateToHebrew(
          formattedInput, 
          llmSettings.openrouter.apiKey, 
          llmSettings.openrouter.selectedModel
        );
        
        // Check if task was cancelled after translation
        const postTranslationState = get();
        const postTranslationTask = postTranslationState.backgroundTasks.find(t => t.id === taskId);
        if (postTranslationTask?.cancelled) {
          return;
        }
        
        // Update the words list with translations
        const translatedWords = translations.flatMap(translation =>
          translation.split(',').map(t => t.trim())
        );

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
        // console.log(`🔄 DEBUG: Processing translated Hebrew words (${translatedWords.length} words)`);
        await processHebrewWords(taskId, translatedWords, existingWords, llmSettings, toast, set, get);
      } else {
        // Process Hebrew words directly
        // console.log(`🔄 DEBUG: Processing Hebrew words directly (${wordsToTranslate.length} words)`);
        await processHebrewWords(taskId, wordsToTranslate, existingWords, llmSettings, toast, set, get);
      }
    }

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
  llmSettings: LLMSettings,
  toast: ToastFn,
  set: (partial: Partial<WordsStore> | ((state: WordsStore) => Partial<WordsStore>)) => void,
  get: () => WordsStore
) {
  // Filter unique words and track skipped duplicates
  const uniqueWords = hebrewWords.filter(newWord =>
    !existingWords.some(existingWord => existingWord.hebrew === newWord)
  );

  const skippedCount = hebrewWords.length - uniqueWords.length;

  if (uniqueWords.length === 0) {
    // Update task with skip statistics
    set((state: WordsStore) => ({
      ...state,
      backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
        task.id === taskId ? {
          ...task,
          status: 'completed' as const,
          progress: 100,
          added: 0,
          skipped: skippedCount,
          failed: 0,
          processedItems: hebrewWords.length,
          failedWords: []
        } : task
      )
    }));

    toast({
      title: 'Фоновая обработка завершена',
      description: `Все ${hebrewWords.length} слов уже существуют в коллекции`,
      variant: 'info',
    });
    return;
  }

  // Process in chunks using settings from config
  const chunkSize = llmSettings.batching.batchSize;
  const chunks = chunkArray(uniqueWords, chunkSize);
  let allValidWords: Word[] = [];
  let allFailedWords: string[] = [];
  let processedCount = 0;


  for (let i = 0; i < chunks.length; i++) {
    // Check if task was cancelled before processing each chunk
    const taskState = get();
    const currentTask = taskState.backgroundTasks.find((t: BackgroundTask) => t.id === taskId);
    if (currentTask?.cancelled) {
      return;
    }

    const chunk = chunks[i];
    // console.log(`🚀 DEBUG: Processing chunk ${i + 1}/${chunks.length} with ${chunk.length} words:`, chunk);
    
    // Add progressive delay between chunks (2-5 seconds, increasing with chunk number)
    if (i > 0) {
      const delaySeconds = Math.min(2 + i * 0.5, 5); // Start at 2s, increase by 0.5s per chunk, max 5s
      const delayMs = delaySeconds * 1000;
      // console.log(`⏱️ DEBUG: Waiting ${delaySeconds}s before processing chunk ${i + 1}...`);
      
      // Check if cancelled during delay
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          const currentTaskState = get().backgroundTasks.find((t: BackgroundTask) => t.id === taskId);
          if (currentTaskState?.cancelled) {
            clearInterval(checkInterval);
            clearTimeout(delayTimeout);
            // console.log(`🚫 DEBUG: Task ${taskId} was cancelled during delay`);
            return;
          }
        }, 100);
        
        const delayTimeout = setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, delayMs);
      });
      
      // Final check after delay
      const finalTaskState = get();
      const finalCurrentTask = finalTaskState.backgroundTasks.find((t: BackgroundTask) => t.id === taskId);
      if (finalCurrentTask?.cancelled) {
        // console.log(`🚫 DEBUG: Task ${taskId} was cancelled after delay, stopping chunk processing at chunk ${i + 1}`);
        return;
      }
    }
    
    try {
      // console.log(`⚡ DEBUG: Calling enrichWordsWithLLM for chunk ${i + 1}`);
      
      // Enhanced LLM enrichment options using batching settings
      const llmOptions = {
        retryConfig: {
          maxRetries: 3,
          baseDelay: Math.max(llmSettings.batching.batchDelay, 1000), // Use batch delay as base, minimum 1s
          maxDelay: llmSettings.batching.maxDelaySeconds * 1000, // Convert seconds to milliseconds
          backoffMultiplier: 2.5
        },
        enableDetailedLogging: true,
        validateJsonResponse: true
      };
      
      // Get API credentials based on current provider
      let apiKey: string;
      let model: string;
      
      if (llmSettings.provider === 'openrouter') {
        apiKey = llmSettings.openrouter.apiKey;
        model = llmSettings.openrouter.selectedModel;
      } else if (llmSettings.provider === 'ollama') {
        // For Ollama, use Ollama enrichment
        const { enrichWordsWithOllama } = await import('../services/ollama');
        
        const result = await enrichWordsWithOllama(
          chunk,
          {
            baseUrl: llmSettings.ollama.apiUrl,
            model: llmSettings.ollama.selectedModel,
            retryConfig: {
              maxRetries: 3,
              baseDelay: Math.max(llmSettings.batching.batchDelay, 1000), // Use batch delay as base, minimum 1s
              maxDelay: llmSettings.batching.maxDelaySeconds * 1000, // Convert seconds to milliseconds
              backoffMultiplier: 2.5
            },
            enableDetailedLogging: true,
            validateJsonResponse: true,
            abortController: currentTask?.abortController
          }
        );
        
        // console.log(`📥 DEBUG: Ollama result for chunk ${i + 1}:`, result);
        
        const valid = result; // Ollama enrichment already returns Word[] format
        // console.log(`✅ DEBUG: Valid words from chunk ${i + 1}: ${valid.length}`, valid.map(w => w.hebrew));
        
        if (valid.length > 0) {
          allValidWords = allValidWords.concat(valid);
          // console.log(`📝 DEBUG: Total valid words so far: ${allValidWords.length}`);
          
          // Add words to store immediately
          set((state: WordsStore) => ({
            ...state,
            words: [...state.words, ...valid]
          }));
          // console.log(`💾 DEBUG: Added ${valid.length} words to store`);
        }

        // Track failed words in this chunk
        const chunkFailed = chunk.filter(w => !valid.some(v => v.hebrew === w));
        allFailedWords = allFailedWords.concat(chunkFailed);
        // console.log(`❌ DEBUG: Failed words from chunk ${i + 1}: ${chunkFailed.length}`, chunkFailed);

        processedCount += chunk.length;
        // console.log(`📊 DEBUG: Progress - processed: ${processedCount}/${uniqueWords.length}`);
        
        // Update progress with detailed statistics
        set((state: WordsStore) => ({
          ...state,
          backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
            task.id === taskId ? {
              ...task,
              processedItems: processedCount,
              progress: Math.round((processedCount / uniqueWords.length) * 75) + 25, // Reserve last 25% for completion
              added: allValidWords.length,
              skipped: skippedCount,
              failed: allFailedWords.length,
              result: allValidWords,
              failedWords: allFailedWords
            } : task
          )
        }));
        
        continue; // Skip the OpenRouter code below
      } else if (llmSettings.provider === 'lmstudio') {
        // For LM Studio, use LM Studio enrichment
        const { enrichWordsWithLMStudio } = await import('../services/lmstudio');
        
        const result = await enrichWordsWithLMStudio(
          chunk,
          {
            baseUrl: llmSettings.lmstudio.apiUrl,
            model: llmSettings.lmstudio.selectedModel,
            retryConfig: {
              maxRetries: 3,
              baseDelay: Math.max(llmSettings.batching.batchDelay, 1000), // Use batch delay as base, minimum 1s
              maxDelay: llmSettings.batching.maxDelaySeconds * 1000, // Convert seconds to milliseconds
              backoffMultiplier: 2.5
            },
            enableDetailedLogging: true,
            validateJsonResponse: true,
            abortController: currentTask?.abortController
          }
        );
        
        // console.log(`📥 DEBUG: LM Studio result for chunk ${i + 1}:`, result);
        
        const valid = result; // LM Studio enrichment already returns Word[] format
        // console.log(`✅ DEBUG: Valid words from chunk ${i + 1}: ${valid.length}`, valid.map(w => w.hebrew));
        
        if (valid.length > 0) {
          allValidWords = allValidWords.concat(valid);
          // console.log(`📝 DEBUG: Total valid words so far: ${allValidWords.length}`);
          
          // Add words to store immediately
          set((state: WordsStore) => ({
            ...state,
            words: [...state.words, ...valid]
          }));
          // console.log(`💾 DEBUG: Added ${valid.length} words to store`);
        }

        // Track failed words in this chunk
        const chunkFailed = chunk.filter(w => !valid.some(v => v.hebrew === w));
        allFailedWords = allFailedWords.concat(chunkFailed);
        // console.log(`❌ DEBUG: Failed words from chunk ${i + 1}: ${chunkFailed.length}`, chunkFailed);

        processedCount += chunk.length;
        // console.log(`📊 DEBUG: Progress - processed: ${processedCount}/${uniqueWords.length}`);
        
        // Update progress with detailed statistics
        set((state: WordsStore) => ({
          ...state,
          backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
            task.id === taskId ? {
              ...task,
              processedItems: processedCount,
              progress: Math.round((processedCount / uniqueWords.length) * 75) + 25, // Reserve last 25% for completion
              added: allValidWords.length,
              skipped: skippedCount,
              failed: allFailedWords.length,
              result: allValidWords,
              failedWords: allFailedWords
            } : task
          )
        }));
        
        continue; // Skip the OpenRouter code below
      } else {
        // OpenRouter is the default/fallback
        apiKey = llmSettings.openrouter.apiKey;
        model = llmSettings.openrouter.selectedModel;
      }
      
      const result = await enrichWordsWithLLM(
        chunk,
        apiKey,
        model,
        undefined,
        undefined,
        currentTask?.abortController,
        llmOptions
      );
      // console.log(`📥 DEBUG: LLM result for chunk ${i + 1}:`, result);
      
      const valid = validateLLMWordsResponse(result);
      // console.log(`✅ DEBUG: Valid words from chunk ${i + 1}: ${valid.length}`, valid.map(w => w.hebrew));
      
      if (valid.length > 0) {
        allValidWords = allValidWords.concat(valid);
        // console.log(`📝 DEBUG: Total valid words so far: ${allValidWords.length}`);
        
        // Add words to store immediately
        set((state: WordsStore) => ({
          ...state,
          words: [...state.words, ...valid]
        }));
        // console.log(`💾 DEBUG: Added ${valid.length} words to store`);
      }

      // Track failed words in this chunk
      const chunkFailed = chunk.filter(w => !valid.some(v => v.hebrew === w));
      allFailedWords = allFailedWords.concat(chunkFailed);
      // console.log(`❌ DEBUG: Failed words from chunk ${i + 1}: ${chunkFailed.length}`, chunkFailed);

      processedCount += chunk.length;
      // console.log(`📊 DEBUG: Progress - processed: ${processedCount}/${uniqueWords.length}`);
      
      // Update progress with detailed statistics
      set((state: WordsStore) => ({
        ...state,
        backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
          task.id === taskId ? {
            ...task,
            processedItems: processedCount,
            progress: Math.round((processedCount / uniqueWords.length) * 75) + 25, // Reserve last 25% for completion
            added: allValidWords.length,
            skipped: skippedCount,
            failed: allFailedWords.length,
            result: allValidWords,
            failedWords: allFailedWords
          } : task
        )
      }));

    } catch (err) {
      console.error(`🚨 DEBUG: Error processing chunk ${i + 1}:`, chunk, err);
      
      // Check if this is an abort error
      if (err instanceof Error && err.name === 'AbortError') {
        // console.log(`🚫 DEBUG: Request aborted for chunk ${i + 1}, task ${taskId}`);
        return; // Stop processing if request was aborted
      }
      
      // Add entire chunk to failed words
      allFailedWords = allFailedWords.concat(chunk);
      processedCount += chunk.length;
      
      // Update with failure stats
      set((state: WordsStore) => ({
        ...state,
        backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
          task.id === taskId ? {
            ...task,
            processedItems: processedCount,
            progress: Math.round((processedCount / uniqueWords.length) * 75) + 25,
            added: allValidWords.length,
            skipped: skippedCount,
            failed: allFailedWords.length,
            result: allValidWords,
            failedWords: allFailedWords
          } : task
        )
      }));
    }

    // Add delay between chunks if configured and not the last chunk
    if (i < chunks.length - 1 && llmSettings.batching.batchDelay > 0) {
      const baseDelay = llmSettings.batching.batchDelay;
      let actualDelay = baseDelay;
      
      // Apply progressive delay if enabled
      if (llmSettings.batching.progressiveDelay) {
        const progressMultiplier = 1 + (i * 0.1); // Increase delay by 10% for each subsequent chunk
        actualDelay = Math.min(
          baseDelay * progressMultiplier,
          llmSettings.batching.maxDelaySeconds * 1000
        );
      }
      
      // console.log(`⏸️ DEBUG: Waiting ${actualDelay}ms before processing chunk ${i + 2}...`);
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      
      // Check if task was cancelled during the delay
      const taskState = get();
      const currentTask = taskState.backgroundTasks.find((t: BackgroundTask) => t.id === taskId);
      if (currentTask?.cancelled) {
        // console.log(`🚫 DEBUG: Task ${taskId} was cancelled during delay, stopping`);
        return;
      }
    }
  }

  // console.log(`🏁 DEBUG: Chunk processing completed for task ${taskId}`);
  // console.log(`📊 DEBUG: Final stats - Valid: ${allValidWords.length}, Failed: ${allFailedWords.length}, Skipped: ${skippedCount}`);

  // Final task completion with full statistics
  set((state: WordsStore) => ({
    ...state,
    backgroundTasks: state.backgroundTasks.map((task: BackgroundTask) =>
      task.id === taskId ? {
        ...task,
        status: 'completed' as const,
        progress: 100,
        added: allValidWords.length,
        skipped: skippedCount,
        failed: allFailedWords.length,
        processedItems: hebrewWords.length,
        result: allValidWords,
        failedWords: allFailedWords
      } : task
    ),
    isBackgroundProcessing: !state.backgroundTasks.every((task: BackgroundTask) =>
      task.id === taskId || task.status === 'completed' || task.status === 'error'
    )
  }));

  // console.log(`✅ DEBUG: Task ${taskId} marked as completed`);

  // Show detailed completion message
  let message = `Добавлено: ${allValidWords.length}`;
  if (skippedCount > 0) message += `, пропущено: ${skippedCount}`;
  if (allFailedWords.length > 0) message += `, не удалось: ${allFailedWords.length}`;

  toast({
    title: 'Фоновая обработка завершена!',
    description: message,
    variant: allValidWords.length > 0 ? 'success' : (allFailedWords.length > 0 ? 'warning' : 'info'),
  });
}


interface WordsStore extends WordsState {
  // Background tasks state
  backgroundTasks: BackgroundTask[];
  isBackgroundProcessing: boolean;
  
  // Word input draft state
  draftInputText: string;
  
  // Refinement state
  refiningWords: Set<string>; // Track which words are being refined
  imageGenerationStatus: Record<string, ImageGenerationStatus>;
  
  // Methods
  addWords: (newWords: Word[], toast: ToastFn) => Promise<void>;
  startBackgroundWordProcessing: (inputText: string, toast: ToastFn) => Promise<string>; // returns task id
  cancelBackgroundTask: (taskId: string) => void;
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
  setDraftInputText: (text: string) => void;
  clearDraftInputText: () => void;
  refineWord: (wordId: string, toast?: ToastFn) => Promise<void>; // New method for word refinement
  generateWordImage: (wordId: string, toast?: ToastFn) => Promise<void>;
  clearWordImage: (wordId: string, toast?: ToastFn) => void;
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
        draftInputText: '',
        refiningWords: new Set<string>(),
        imageGenerationStatus: {} as Record<string, ImageGenerationStatus>,
      }
    : initialStoreState;

  if (
    typeof window !== 'undefined' &&
    state.words.some(word => word.image?.storageKey && !word.image?.dataUrl)
  ) {
    hydrateImagesFromStorage(state.words, set);
  }

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
      const targetWord = get().words.find(word => word.id === id);
      if (targetWord?.image?.storageKey) {
        void deleteWordImageData(targetWord.image.storageKey).catch(error =>
          console.error('Не удалось удалить изображение слова', error)
        );
      }
      set(state => {
        const updatedWords = state.words.filter(word => word.id !== id);
        let newCurrentIndex = state.currentIndex;
        if (newCurrentIndex >= updatedWords.length) {
          newCurrentIndex = Math.max(0, updatedWords.length - 1);
        }
        const restStatuses = { ...state.imageGenerationStatus };
        delete restStatuses[id];
        return {
          ...state,
          words: updatedWords,
          currentIndex: newCurrentIndex,
          imageGenerationStatus: restStatuses,
        };
      });
    },

    updateWord: updatedWord => {
      // console.log('🔍 DEBUG wordsStore updateWord - updatedWord:', updatedWord);
      // console.log('🔍 DEBUG wordsStore updateWord - updatedWord.conjugations:', updatedWord.conjugations);
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
          imageGenerationStatus: {},
        });
        if (typeof window !== 'undefined' && words.some(word => word.image?.storageKey && !word.image?.dataUrl)) {
          hydrateImagesFromStorage(words, set);
        }
      } else {
        set(state => ({
          ...state,
          ...initialState,
          imageGenerationStatus: {},
        }));
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
          imageGenerationStatus: {},
        };
      });
      if (typeof window !== 'undefined' && newWords.some(word => word.image?.storageKey && !word.image?.dataUrl)) {
        hydrateImagesFromStorage(newWords, set);
      }
    },

    /**
     * Clears all words and resets all related state,
     * including currentWord, currentIndex, and progress.
     */
    clearAllWords: toast => {
      void clearAllWordImages().catch(error => {
        console.error('Не удалось очистить изображения', error);
      });
      set(state => ({
        ...state,
        ...initialState,
        backgroundTasks: [],
        isBackgroundProcessing: false,
        draftInputText: '',
        refiningWords: new Set<string>(),
        imageGenerationStatus: {},
      }));
      toast?.({
        title: 'Успех!',
        description: 'Все слова удалены из коллекции',
      });
    },

    // Background processing methods
    startBackgroundWordProcessing: async (inputText: string, toast: ToastFn) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create new task
      const abortController = new AbortController();
      const newTask: BackgroundTask = {
        id: taskId,
        type: 'addWords',
        status: 'pending',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
        added: 0,
        skipped: 0,
        failed: 0,
        words: [],
        failedWords: [],
        createdAt: Date.now(),
        cancelled: false,
        abortController: abortController
      };

      // Add task to state
      set(state => ({
        ...state,
        backgroundTasks: [...state.backgroundTasks, newTask],
        isBackgroundProcessing: true
      }));

      // Start processing in background
      processWordsInBackground(taskId, inputText, toast, set, get).catch(error => {
        console.error('🚨 DEBUG: Unhandled error in processWordsInBackground:', error);
        // Ensure task is marked as failed if there's an unhandled error
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
      });
      
      return taskId;
    },

    cancelBackgroundTask: (taskId: string) => {
      set((state: WordsStore) => {
        const task = state.backgroundTasks.find(t => t.id === taskId);
        if (!task) return state;
        
        // Set cancelled flag
        if (task.abortController) {
          task.abortController.abort();
        }
        
        return {
          ...state,
          backgroundTasks: state.backgroundTasks.map((t: BackgroundTask) =>
            t.id === taskId ? {
              ...t,
              cancelled: true,
              status: 'error' as const,
              error: 'Операция отменена'
            } : t
          ),
          isBackgroundProcessing: state.backgroundTasks.some((t: BackgroundTask) =>
            t.id !== taskId && (t.status === 'running' || t.status === 'pending')
          )
        };
      });
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

    setDraftInputText: (text: string) => {
      set(state => ({
        ...state,
        draftInputText: text
      }));
    },

    clearDraftInputText: () => {
      set(state => ({
        ...state,
        draftInputText: ''
      }));
    },

    // Refine word function
    refineWord: async (wordId: string, toast?: ToastFn) => {
      const state = get();
      const word = state.words.find(w => w.id === wordId);
      
      if (!word) {
        toast?.({
          title: 'Ошибка',
          description: 'Слово не найдено',
          variant: 'destructive',
        });
        return;
      }

      // Check if word is already being refined
      if (state.refiningWords.has(wordId)) {
        toast?.({
          title: 'Информация',
          description: 'Слово уже обрабатывается',
        });
        return;
      }

      // Load current LLM settings for refinement
      const llmSettings = loadLLMSettings();
      
      if (llmSettings.provider !== 'openrouter' || !llmSettings.openrouter.apiKey || !llmSettings.openrouter.selectedModel) {
        toast?.({
          title: 'Ошибка',
          description: 'OpenRouter не настроен для уточнения слов. Проверьте настройки.',
          variant: 'destructive',
        });
        return;
      }

      // Add word to refining set
      set(state => ({
        ...state,
        refiningWords: new Set([...state.refiningWords, wordId])
      }));

      toast?.({
        title: 'Обработка',
        description: `Уточняем перевод для "${word.hebrew}"...`,
      });

      try {
        const refinedWord = await refineWordWithLLM(
          word, 
          llmSettings.openrouter.apiKey, 
          llmSettings.openrouter.selectedModel, 
          toast, 
          {
            enableDetailedLogging: true,
            validateJsonResponse: true
          }
        );

        // Update word in store
        set(state => ({
          ...state,
          words: state.words.map(w => w.id === wordId ? refinedWord : w),
          refiningWords: new Set([...state.refiningWords].filter(id => id !== wordId))
        }));

        toast?.({
          title: 'Готово!',
          description: `Слово "${word.hebrew}" успешно уточнено`,
        });

      } catch (error) {
        // Remove word from refining set on error
        set(state => ({
          ...state,
          refiningWords: new Set([...state.refiningWords].filter(id => id !== wordId))
        }));

        console.error('Error refining word:', error);
        
        toast?.({
          title: 'Ошибка уточнения',
          description: error instanceof Error ? error.message : 'Неизвестная ошибка',
          variant: 'destructive',
        });
      }
    },

    generateWordImage: async (wordId, toast) => {
      const state = get();
      const word = state.words.find(w => w.id === wordId);

      if (!word) {
        toast?.({
          title: 'Ошибка',
          description: 'Слово не найдено',
          variant: 'destructive',
        });
        return;
      }

      if (!word.hebrew) {
        toast?.({
          title: 'Ошибка',
          description: 'Для генерации иконки требуется текст на иврите',
          variant: 'destructive',
        });
        return;
      }

      const imageSettings = loadImageSettings();

      if (imageSettings.provider === 'banana-gemini' && !imageSettings.banana.apiKey) {
        toast?.({
          title: 'Настройте API',
          description: 'Укажите API ключ Gemini Banana в разделе “Image Generation API”.',
          variant: 'destructive',
        });
        return;
      }

      set(state => ({
        ...state,
        imageGenerationStatus: {
          ...state.imageGenerationStatus,
          [wordId]: { status: 'generating' },
        },
      }));

      try {
        const imageAsset = await generateWordImageAsset({
          word,
          settings: imageSettings,
        });
        if (!imageAsset.dataUrl) {
          throw new Error('Провайдер не вернул изображение');
        }

        let storageKey: string | undefined = word.image?.storageKey || `word-image-${word.id}`;
        try {
          await saveWordImageData(storageKey, imageAsset.dataUrl);
        } catch (storageError) {
          console.error('Не удалось сохранить изображение локально', storageError);
          storageKey = undefined;
        }

        const imageWithStorage = {
          ...imageAsset,
          storageKey,
        };

        set(state => ({
          ...state,
          words: state.words.map(w => (w.id === wordId ? { ...w, image: imageWithStorage } : w)),
          imageGenerationStatus: {
            ...state.imageGenerationStatus,
            [wordId]: { status: 'idle' },
          },
        }));

        toast?.({
          title: 'Иконка готова',
          description: `Создано изображение для "${word.hebrew}"`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
        set(state => ({
          ...state,
          imageGenerationStatus: {
            ...state.imageGenerationStatus,
            [wordId]: { status: 'error', error: message },
          },
        }));

        toast?.({
          title: 'Ошибка генерации',
          description: message,
          variant: 'destructive',
        });
      }
    },

    clearWordImage: (wordId, toast) => {
      const targetWord = get().words.find(word => word.id === wordId);
      if (targetWord?.image?.storageKey) {
        void deleteWordImageData(targetWord.image.storageKey).catch(error =>
          console.error('Не удалось удалить изображение', error)
        );
      }
      set(state => ({
        ...state,
        words: state.words.map(word =>
          word.id === wordId ? { ...word, image: null } : word
        ),
        imageGenerationStatus: {
          ...state.imageGenerationStatus,
          [wordId]: { status: 'idle' },
        },
      }));

      toast?.({
        title: 'Иконка удалена',
        description: 'Изображение можно сгенерировать повторно в любой момент.',
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
  // console.log('🔍 DEBUG localStorage subscribe - saving state to localStorage');
  // console.log('🔍 DEBUG localStorage subscribe - words with conjugations:', state.words.filter(w => w.conjugations));
  if (state.words.length > 0 || state.currentIndex !== 0) {
    saveToLocalStorage({ words: state.words, currentIndex: state.currentIndex });
    // console.log('🔍 DEBUG localStorage subscribe - saved to localStorage');
  }
});
