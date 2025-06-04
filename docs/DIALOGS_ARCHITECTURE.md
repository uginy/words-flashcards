# Архитектура функционала "Генератор диалогов с озвучкой"

## Обзор

Данный документ описывает архитектурное решение для интеграции нового функционала "Генератор диалогов с озвучкой" в существующее приложение words-flashcards. Функционал добавляет возможность генерации и изучения диалогов на иврите с поддержкой озвучки.

## Анализ существующей архитектуры

### Текущая структура проекта:

1. **Типы данных** (`src/types/index.ts`): Центральная система типов с `Word`, `WordCategory`, `BackgroundTask`
2. **Состояние** (`src/store/wordsStore.ts`): Zustand store с полной бизнес-логикой
3. **Сервисы** (`src/services/openrouter/`): Модульная система работы с OpenRouter API
4. **UI компоненты** (`src/components/`): Реактивные компоненты с четким разделением ответственности
5. **Навигация** (`src/App.tsx`): Табовая структура с централизованным роутингом

### Ключевые паттерны:
- **Единый стор** с методами для управления данными
- **Фоновая обработка** с progress tracking и error handling
- **LLM интеграция** через OpenRouter с retry логикой
- **Модульные сервисы** с типизацией и валидацией
- **Web Speech API** для озвучки

## Архитектурное решение

```mermaid
graph TB
    subgraph "Общие утилиты"
        CU[commonUtils.ts]
        ST[storageTypes.ts]
        BT[backgroundTaskUtils.ts]
    end
    
    subgraph "Типы данных"
        WT[Word Types]
        DT[Dialog Types]
        CT[Common Types]
    end
    
    subgraph "Сторы"
        WS[wordsStore.ts]
        DS[dialogsStore.ts]
    end
    
    subgraph "Сервисы"
        OR[openrouter/]
        DG[dialogGeneration.ts]
        TS[ttsService.ts]
    end
    
    subgraph "UI компоненты"
        WC[Word Components]
        DC[Dialog Components]
        SC[Shared Components]
    end
    
    subgraph "Навигация"
        APP[App.tsx]
        TAB[Новая вкладка "Диалоги"]
    end
    
    CU --> WS
    CU --> DS
    ST --> WS
    ST --> DS
    BT --> WS
    BT --> DS
    
    WT --> WS
    DT --> DS
    CT --> WS
    CT --> DS
    
    OR --> DG
    DG --> DS
    TS --> DC
    
    WC --> APP
    DC --> APP
    SC --> APP
    TAB --> APP
```

## 1. Новые типы данных

### Расширение `src/types/index.ts`:

```typescript
// Добавление новой категории для диалогов
export type WordCategory = 'שם עצם' | 'פועל' | 'שם תואר' | 'פרזות' | 'אחר' | 'דיאלוג';

// Новые типы для диалогов
export type DialogLevel = 'אלף' | 'בית' | 'גימל' | 'דלת' | 'הא';
export type ParticipantGender = 'male' | 'female';

export interface DialogParticipant {
  id: string;
  name: string;
  gender: ParticipantGender;
  voiceSettings?: {
    pitch: number;
    rate: number;
    volume: number;
  };
}

export interface DialogCard {
  id: string;
  hebrew: string;
  russian: string;
  speaker: string; // ID участника
  order: number;
}

export interface Dialog {
  id: string;
  title: string; // тема диалога на иврите
  titleRu: string; // перевод темы на русский
  level: DialogLevel;
  participants: DialogParticipant[];
  cards: DialogCard[];
  isLearned: boolean;
  learningStage: number; // 0-5, как у слов
  dateAdded: number;
  lastReviewed?: number | null;
  nextReview?: number | null;
  showTranslation?: boolean;
  usedWords?: string[]; // слова из пользовательской коллекции
  newWords?: Word[]; // новые слова, добавленные с диалогом
}

export interface DialogGenerationSettings {
  level: DialogLevel;
  participantCount: 2 | 3;
  participants: DialogParticipant[];
  useExistingWords: boolean;
  includeNewWords: boolean;
  wordsToUse?: string[]; // конкретные слова для включения
  topic?: string; // опциональная тема
}

export interface DialogBackgroundTask {
  id: string;
  type: 'generateDialog';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  settings: DialogGenerationSettings;
  result?: Dialog;
  error?: string;
  createdAt: number;
  cancelled?: boolean;
  abortController?: AbortController;
}

export interface DialogStats {
  total: number;
  learned: number;
  remaining: number;
  needReview: number;
  levelDistribution: Record<DialogLevel, number>;
}

export interface DialogsState {
  dialogs: Dialog[];
  currentDialogIndex: number;
  backgroundTasks: DialogBackgroundTask[];
  isBackgroundProcessing: boolean;
  generationSettings: DialogGenerationSettings | null;
}
```

### Новые общие типы `src/types/common.ts`:

```typescript
export interface BackgroundTaskBase {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  createdAt: number;
  cancelled?: boolean;
  abortController?: AbortController;
  error?: string;
}

export type ToastFunction = (opts: {
  title: string;
  description: string;
  variant?: 'success' | 'error' | 'info';
}) => void;

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}
```

## 2. Отдельный стор для диалогов

### Новый `src/store/dialogsStore.ts`:

```typescript
import { create } from 'zustand';
import type { Dialog, DialogsState, DialogBackgroundTask, DialogGenerationSettings, DialogStats } from '../types';
import { saveToLocalStorage, loadFromLocalStorage } from '../utils/storage';
import { generateDialogWithLLM } from '../services/dialogGeneration';
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';

const DIALOGS_STORAGE_KEY = 'flashcards-dialogs';

const initialState: DialogsState = {
  dialogs: [],
  currentDialogIndex: 0,
  backgroundTasks: [],
  isBackgroundProcessing: false,
  generationSettings: null,
};

// Функция для вычисления статистики диалогов
export function getDialogStats(dialogs: Dialog[]): DialogStats {
  const total = dialogs.length;
  const learned = dialogs.filter(dialog => dialog.isLearned).length;
  const needReview = dialogs.filter(dialog => {
    return dialog.isLearned && 
           (dialog.nextReview === undefined || 
            dialog.nextReview === null || 
            dialog.nextReview <= Date.now());
  }).length;
  
  const levelDistribution = dialogs.reduce((acc, dialog) => {
    acc[dialog.level] = (acc[dialog.level] || 0) + 1;
    return acc;
  }, {} as Record<DialogLevel, number>);
  
  return {
    total,
    learned,
    remaining: total - learned,
    needReview,
    levelDistribution
  };
}

interface DialogsStore extends DialogsState {
  // Основные методы управления диалогами
  addDialog: (dialog: Dialog) => void;
  updateDialog: (dialog: Dialog) => void;
  deleteDialog: (id: string) => void;
  
  // Методы изучения
  markDialogAsLearned: (id: string) => void;
  markDialogAsNotLearned: (id: string) => void;
  resetDialogProgress: (id: string) => void;
  nextDialog: () => void;
  previousDialog: () => void;
  
  // Методы генерации
  startDialogGeneration: (settings: DialogGenerationSettings, toast: ToastFunction) => Promise<void>;
  cancelDialogGeneration: (taskId: string) => void;
  clearCompletedTasks: () => void;
  
  // Утилиты
  getDialogStats: () => DialogStats;
  getCurrentDialog: () => Dialog | undefined;
  replaceAllDialogs: (dialogs: Dialog[], toast: ToastFunction) => void;
  clearAllDialogs: (toast: ToastFunction) => void;
}

export const useDialogsStore = create<DialogsStore>((set, get) => {
  // Загрузка данных из localStorage при инициализации
  const storedDialogs = loadFromLocalStorage(DIALOGS_STORAGE_KEY, []);
  const initialStoreState = {
    ...initialState,
    dialogs: storedDialogs,
  };

  // Синхронизация с localStorage при изменении dialogs
  const syncToStorage = (dialogs: Dialog[]) => {
    saveToLocalStorage(DIALOGS_STORAGE_KEY, dialogs);
  };

  return {
    ...initialStoreState,

    addDialog: (dialog) => {
      set(state => {
        const newDialogs = [...state.dialogs, dialog];
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },

    updateDialog: (updatedDialog) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog =>
          dialog.id === updatedDialog.id ? updatedDialog : dialog
        );
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },

    deleteDialog: (id) => {
      set(state => {
        const newDialogs = state.dialogs.filter(dialog => dialog.id !== id);
        syncToStorage(newDialogs);
        return { 
          dialogs: newDialogs,
          currentDialogIndex: Math.min(state.currentDialogIndex, newDialogs.length - 1)
        };
      });
    },

    markDialogAsLearned: (id) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog => {
          if (dialog.id === id) {
            const newStage = Math.min((dialog.learningStage || 0) + 1, 5);
            const intervals = [0, 1, 3, 7, 14, 30]; // дни
            const nextReview = Date.now() + (intervals[newStage] * 24 * 60 * 60 * 1000);
            
            return {
              ...dialog,
              isLearned: true,
              learningStage: newStage,
              lastReviewed: Date.now(),
              nextReview
            };
          }
          return dialog;
        });
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },

    markDialogAsNotLearned: (id) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog =>
          dialog.id === id 
            ? { ...dialog, isLearned: false, learningStage: 0, nextReview: null }
            : dialog
        );
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },

    resetDialogProgress: (id) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog =>
          dialog.id === id 
            ? { 
                ...dialog, 
                isLearned: false, 
                learningStage: 0, 
                lastReviewed: null, 
                nextReview: null 
              }
            : dialog
        );
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },

    nextDialog: () => {
      set(state => ({
        currentDialogIndex: (state.currentDialogIndex + 1) % state.dialogs.length
      }));
    },

    previousDialog: () => {
      set(state => ({
        currentDialogIndex: (state.currentDialogIndex - 1 + state.dialogs.length) % state.dialogs.length
      }));
    },

    startDialogGeneration: async (settings, toast) => {
      const taskId = Date.now().toString();
      
      // Создание задачи
      const task: DialogBackgroundTask = {
        id: taskId,
        type: 'generateDialog',
        status: 'pending',
        progress: 0,
        settings,
        createdAt: Date.now(),
        abortController: new AbortController()
      };

      set(state => ({
        backgroundTasks: [...state.backgroundTasks, task],
        isBackgroundProcessing: true,
        generationSettings: settings
      }));

      try {
        // Обновление статуса на "выполняется"
        set(state => ({
          backgroundTasks: state.backgroundTasks.map(t =>
            t.id === taskId ? { ...t, status: 'running' as const } : t
          )
        }));

        const apiKey = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY;
        const model = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL;
        
        if (!apiKey || !model || apiKey === "YOUR_DEFAULT_API_KEY_HERE") {
          throw new Error('OpenRouter API key или model не настроены');
        }

        // Генерация диалога
        const dialog = await generateDialogWithLLM(
          settings,
          apiKey,
          model,
          { abortController: task.abortController }
        );

        // Проверка на отмену
        const currentState = get();
        const currentTask = currentState.backgroundTasks.find(t => t.id === taskId);
        if (currentTask?.cancelled) {
          return;
        }

        // Добавление диалога в коллекцию
        set(state => {
          const newDialogs = [...state.dialogs, dialog];
          syncToStorage(newDialogs);
          return {
            dialogs: newDialogs,
            backgroundTasks: state.backgroundTasks.map(t =>
              t.id === taskId ? {
                ...t,
                status: 'completed' as const,
                progress: 100,
                result: dialog
              } : t
            ),
            isBackgroundProcessing: state.backgroundTasks.some(t =>
              t.id !== taskId && (t.status === 'pending' || t.status === 'running')
            )
          };
        });

        toast({
          title: 'Диалог создан!',
          description: `Диалог "${dialog.title}" успешно добавлен`,
          variant: 'success',
        });

      } catch (error) {
        set(state => ({
          backgroundTasks: state.backgroundTasks.map(t =>
            t.id === taskId ? {
              ...t,
              status: 'error' as const,
              error: error instanceof Error ? error.message : String(error)
            } : t
          ),
          isBackgroundProcessing: state.backgroundTasks.some(t =>
            t.id !== taskId && (t.status === 'pending' || t.status === 'running')
          )
        }));

        toast({
          title: 'Ошибка генерации диалога',
          description: error instanceof Error ? error.message : String(error),
          variant: 'error',
        });
      }
    },

    cancelDialogGeneration: (taskId) => {
      set(state => {
        const task = state.backgroundTasks.find(t => t.id === taskId);
        if (task?.abortController) {
          task.abortController.abort();
        }
        
        return {
          backgroundTasks: state.backgroundTasks.map(t =>
            t.id === taskId ? { ...t, cancelled: true, status: 'error' as const } : t
          ),
          isBackgroundProcessing: state.backgroundTasks.some(t =>
            t.id !== taskId && (t.status === 'pending' || t.status === 'running')
          )
        };
      });
    },

    clearCompletedTasks: () => {
      set(state => ({
        backgroundTasks: state.backgroundTasks.filter(t =>
          t.status === 'pending' || t.status === 'running'
        )
      }));
    },

    getDialogStats: () => {
      return getDialogStats(get().dialogs);
    },

    getCurrentDialog: () => {
      const state = get();
      return state.dialogs[state.currentDialogIndex];
    },

    replaceAllDialogs: (dialogs, toast) => {
      set(() => {
        syncToStorage(dialogs);
        return {
          dialogs,
          currentDialogIndex: 0
        };
      });
      
      toast({
        title: 'Диалоги импортированы',
        description: `Загружено ${dialogs.length} диалогов`,
        variant: 'success',
      });
    },

    clearAllDialogs: (toast) => {
      set(() => {
        syncToStorage([]);
        return {
          dialogs: [],
          currentDialogIndex: 0
        };
      });
      
      toast({
        title: 'Диалоги удалены',
        description: 'Все диалоги были удалены',
        variant: 'success',
      });
    }
  };
});

// Утилитарная функция для получения текущего диалога
export function getCurrentDialog(dialogs: Dialog[], currentIndex: number): Dialog | undefined {
  return dialogs[currentIndex];
}

// Синхронизация с localStorage при изменениях
useDialogsStore.subscribe(state => {
  saveToLocalStorage(DIALOGS_STORAGE_KEY, state.dialogs);
});
```

## 3. Общие утилиты для предотвращения дублирования

### Новый `src/utils/commonStore.ts`:

```typescript
import type { ToastFunction, RetryConfig } from '../types/common';

// Общие утилиты для работы с фоновыми задачами
export function createBackgroundTaskId(): string {
  return Date.now().toString();
}

export function calculateProgress(processed: number, total: number): number {
  return total > 0 ? Math.round((processed / total) * 100) : 0;
}

// Общие конфигурации
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1500,
  maxDelay: 15000,
  backoffMultiplier: 2.5
};

// Общие интервалы для spaced repetition
export const LEARNING_INTERVALS = [0, 1, 3, 7, 14, 30]; // дни

// Утилита для расчета следующего повторения
export function calculateNextReview(stage: number): number {
  const days = LEARNING_INTERVALS[Math.min(stage, LEARNING_INTERVALS.length - 1)];
  return Date.now() + (days * 24 * 60 * 60 * 1000);
}

// Общая логика для обновления learning stage
export function updateLearningStage(currentStage: number, isLearned: boolean): {
  stage: number;
  nextReview: number | null;
} {
  if (!isLearned) {
    return { stage: 0, nextReview: null };
  }
  
  const newStage = Math.min(currentStage + 1, 5);
  const nextReview = calculateNextReview(newStage);
  
  return { stage: newStage, nextReview };
}
```

### Расширение `src/utils/storage.ts`:

```typescript
// Добавить новые ключи для диалогов
export const STORAGE_KEYS = {
  WORDS: 'flashcards-words',
  DIALOGS: 'flashcards-dialogs',
  DIALOG_SETTINGS: 'dialog-generation-settings',
  WORD_SETTINGS: 'word-settings'
} as const;

// Добавить типизированные методы для диалогов
export function saveDialogsToStorage<T>(key: string, data: T): void {
  saveToLocalStorage(key, data);
}

export function loadDialogsFromStorage<T>(key: string, defaultValue: T): T {
  return loadFromLocalStorage(key, defaultValue);
}
```

## 4. Новые сервисы

### 4.1 Сервис генерации диалогов `src/services/dialogGeneration.ts`:

```typescript
import { createOpenAIClient, retryWithBackoff } from './openrouter/api-client';
import type { Dialog, DialogGenerationSettings, DialogParticipant, DialogCard } from '../types';
import { DEFAULT_RETRY_CONFIG } from '../utils/commonStore';

interface DialogGenerationOptions {
  retryConfig?: typeof DEFAULT_RETRY_CONFIG;
  abortController?: AbortController;
}

interface LLMDialogResponse {
  title: string;
  titleRu: string;
  cards: Array<{
    hebrew: string;
    russian: string;
    speaker: string;
    order: number;
  }>;
  usedWords?: string[];
  newWords?: Array<{
    hebrew: string;
    russian: string;
    transcription: string;
    category: string;
  }>;
}

export async function generateDialogWithLLM(
  settings: DialogGenerationSettings,
  apiKey: string,
  model: string,
  options?: DialogGenerationOptions
): Promise<Dialog> {
  const client = createOpenAIClient(apiKey);
  const retryConfig = options?.retryConfig || DEFAULT_RETRY_CONFIG;
  
  const prompt = createDialogPrompt(settings);
  
  const operation = async () => {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: getDialogSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }, {
      signal: options?.abortController?.signal
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Пустой ответ от LLM');
    }

    return JSON.parse(content) as LLMDialogResponse;
  };

  try {
    const llmResponse = await retryWithBackoff(operation, retryConfig);
    
    // Преобразование ответа LLM в объект Dialog
    const dialog: Dialog = {
      id: Date.now().toString(),
      title: llmResponse.title,
      titleRu: llmResponse.titleRu,
      level: settings.level,
      participants: settings.participants,
      cards: llmResponse.cards.map(card => ({
        id: `${Date.now()}-${card.order}`,
        hebrew: card.hebrew,
        russian: card.russian,
        speaker: card.speaker,
        order: card.order
      })),
      isLearned: false,
      learningStage: 0,
      dateAdded: Date.now(),
      usedWords: llmResponse.usedWords,
      newWords: llmResponse.newWords?.map(word => ({
        id: Date.now().toString() + Math.random(),
        hebrew: word.hebrew,
        russian: word.russian,
        transcription: word.transcription,
        category: word.category as any,
        isLearned: false,
        dateAdded: Date.now(),
        learningStage: 0
      }))
    };

    return dialog;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Генерация диалога была отменена');
    }
    throw error;
  }
}

function createDialogPrompt(settings: DialogGenerationSettings): string {
  const { level, participantCount, participants, useExistingWords, includeNewWords, wordsToUse, topic } = settings;
  
  let prompt = `Создай диалог на иврите между ${participantCount} участниками.\n`;
  prompt += `Уровень сложности: ${level}\n`;
  prompt += `Участники: ${participants.map(p => `${p.name} (${p.gender})`).join(', ')}\n`;
  
  if (topic) {
    prompt += `Тема диалога: ${topic}\n`;
  }
  
  if (useExistingWords && wordsToUse?.length) {
    prompt += `Используй эти слова: ${wordsToUse.join(', ')}\n`;
  }
  
  if (includeNewWords) {
    prompt += `Можешь добавить новые слова соответствующего уровня.\n`;
  }
  
  prompt += `\nОтветь в JSON формате согласно схеме.`;
  
  return prompt;
}

function getDialogSystemPrompt(): string {
  return `Ты - эксперт по изучению иврита. Создавай естественные диалоги для изучающих язык.

Правила:
1. Диалоги должны быть практичными и полезными
2. Используй современный разговорный иврит
3. Соблюдай уровень сложности
4. Включай культурный контекст

Уровни сложности:
- אלף: Базовые фразы, простые конструкции
- בית: Повседневные ситуации, прошедшее время
- גימל: Будущее время, более сложная лексика
- דלת: Абстрактные понятия, сложные конструкции
- הא: Продвинутый уровень, идиомы, литературный язык

Формат ответа (JSON):
{
  "title": "Название диалога на иврите",
  "titleRu": "Перевод названия на русский",
  "cards": [
    {
      "hebrew": "Реплика на иврите",
      "russian": "Перевод на русский",
      "speaker": "ID участника",
      "order": 1
    }
  ],
  "usedWords": ["слово1", "слово2"],
  "newWords": [
    {
      "hebrew": "новое слово",
      "russian": "перевод",
      "transcription": "транскрипция",
      "category": "часть речи"
    }
  ]
}`;
}
```

### 4.2 Расширение TTS сервиса `src/hooks/useDialogSpeech.ts`:

```typescript
import { useState, useCallback } from 'react';
import type { DialogParticipant, DialogCard } from '../types';

interface DialogSpeechOptions {
  autoAdvance?: boolean;
  pauseBetweenSpeakers?: number; // миллисекунды
}

interface UseDialogSpeechReturn {
  speak: (text: string, participant: DialogParticipant) => void;
  playSequence: (cards: DialogCard[], participants: DialogParticipant[], options?: DialogSpeechOptions) => void;
  stop: () => void;
  isPlaying: boolean;
  currentCardIndex: number;
}

export function useDialogSpeech(): UseDialogSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);

  const speak = useCallback((text: string, participant: DialogParticipant) => {
    if ('speechSynthesis' in window) {
      // Остановить текущее воспроизведение
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Настройка голоса на основе участника
      utterance.lang = 'he-IL';
      utterance.pitch = participant.voiceSettings?.pitch || (participant.gender === 'female' ? 1.2 : 0.8);
      utterance.rate = participant.voiceSettings?.rate || 0.9;
      utterance.volume = participant.voiceSettings?.volume || 1;
      
      speechSynthesis.speak(utterance);
    }
  }, []);

  const playSequence = useCallback(async (
    cards: DialogCard[], 
    participants: DialogParticipant[], 
    options: DialogSpeechOptions = {}
  ) => {
    if (!('speechSynthesis' in window) || cards.length === 0) return;
    
    setIsPlaying(true);
    setCurrentCardIndex(0);
    
    const sortedCards = [...cards].sort((a, b) => a.order - b.order);
    const pauseDuration = options.pauseBetweenSpeakers || 1000;
    
    for (let i = 0; i < sortedCards.length; i++) {
      const card = sortedCards[i];
      const participant = participants.find(p => p.id === card.speaker);
      
      if (!participant) continue;
      
      setCurrentCardIndex(i);
      
      // Проигрывание реплики
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(card.hebrew);
        
        utterance.lang = 'he-IL';
        utterance.pitch = participant.voiceSettings?.pitch || (participant.gender === 'female' ? 1.2 : 0.8);
        utterance.rate = participant.voiceSettings?.rate || 0.9;
        utterance.volume = participant.voiceSettings?.volume || 1;
        
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        
        speechSynthesis.speak(utterance);
      });
      
      // Пауза между репликами (кроме последней)
      if (i < sortedCards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, pauseDuration));
      }
    }
    
    setIsPlaying(false);
    setCurrentCardIndex(-1);
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentCardIndex(-1);
  }, []);

  return {
    speak,
    playSequence,
    stop,
    isPlaying,
    currentCardIndex
  };
}
```

## 5. UI компоненты

### 5.1 Основной интерфейс диалогов `src/components/DialogInterface.tsx`:

```typescript
import React, { useState } from 'react';
import type { Dialog } from '../types';
import { DialogCard } from './DialogCard';
import { useDialogSpeech } from '../hooks/useDialogSpeech';
import { Button } from './ui/button';

interface DialogInterfaceProps {
  dialog: Dialog;
  onMarkAsLearned: (id: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalDialogs: number;
}

export const DialogInterface: React.FC<DialogInterfaceProps> = ({
  dialog,
  onMarkAsLearned,
  onNext,
  onPrevious,
  currentIndex,
  totalDialogs
}) => {
  const [showTranslations, setShowTranslations] = useState(false);
  const { speak, playSequence, stop, isPlaying, currentCardIndex } = useDialogSpeech();
  
  const sortedCards = [...dialog.cards].sort((a, b) => a.order - b.order);

  const handlePlayAll = () => {
    if (isPlaying) {
      stop();
    } else {
      playSequence(sortedCards, dialog.participants, {
        pauseBetweenSpeakers: 1500
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      {/* Заголовок диалога */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {dialog.title}
        </h2>
        {showTranslations && (
          <p className="text-lg text-gray-600">{dialog.titleRu}</p>
        )}
        <div className="flex items-center justify-center gap-4 mt-4">
          <span className="text-sm text-gray-500">
            Диалог {currentIndex + 1} из {totalDialogs}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
            {dialog.level}
          </span>
        </div>
      </div>

      {/* Управление */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          onClick={() => setShowTranslations(!showTranslations)}
          variant="outline"
        >
          {showTranslations ? 'Скрыть переводы' : 'Показать переводы'}
        </Button>
        <Button
          onClick={handlePlayAll}
          variant="outline"
          className={isPlaying ? 'bg-red-50 border-red-300' : ''}
        >
          {isPlaying ? 'Остановить' : 'Проиграть весь диалог'}
        </Button>
      </div>

      {/* Диалог */}
      <div className="space-y-4 mb-8">
        {sortedCards.map((card, index) => {
          const participant = dialog.participants.find(p => p.id === card.speaker);
          const isCurrentlyPlaying = isPlaying && currentCardIndex === index;
          
          return (
            <DialogCard
              key={card.id}
              card={card}
              participant={participant!}
              showTranslation={showTranslations}
              onSpeak={speak}
              isPlaying={isCurrentlyPlaying}
            />
          );
        })}
      </div>

      {/* Навигация */}
      <div className="flex justify-between items-center">
        <Button onClick={onPrevious} variant="outline">
          ← Предыдущий
        </Button>
        
        <div className="flex gap-4">
          <Button
            onClick={() => onMarkAsLearned(dialog.id)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Знаю диалог
          </Button>
        </div>
        
        <Button onClick={onNext} variant="outline">
          Следующий →
        </Button>
      </div>
    </div>
  );
};
```

### 5.2 Карточка реплики `src/components/DialogCard.tsx`:

```typescript
import React from 'react';
import type { DialogCard as DialogCardType, DialogParticipant } from '../types';
import { Button } from './ui/button';
import { SpeakerIcon } from './SpeakerIcon';

interface DialogCardProps {
  card: DialogCardType;
  participant: DialogParticipant;
  showTranslation: boolean;
  onSpeak: (text: string, participant: DialogParticipant) => void;
  isPlaying?: boolean;
}

export const DialogCard: React.FC<DialogCardProps> = ({
  card,
  participant,
  showTranslation,
  onSpeak,
  isPlaying = false
}) => {
  const isLeftSide = participant.gender === 'female';
  
  return (
    <div className={`flex ${isLeftSide ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
        isLeftSide 
          ? 'bg-gray-100 text-gray-900' 
          : 'bg-blue-500 text-white'
      } ${isPlaying ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}>
        
        {/* Имя участника */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-medium ${
            isLeftSide ? 'text-gray-600' : 'text-blue-100'
          }`}>
            {participant.name}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSpeak(card.hebrew, participant)}
            className={`p-1 h-6 w-6 ${
              isLeftSide 
                ? 'hover:bg-gray-200 text-gray-600' 
                : 'hover:bg-blue-600 text-blue-100'
            }`}
          >
            <SpeakerIcon className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Текст реплики */}
        <div className="text-right mb-2">
          <p className="text-lg font-medium">{card.hebrew}</p>
        </div>
        
        {/* Перевод */}
        {showTranslation && (
          <div className="text-left">
            <p className={`text-sm ${
              isLeftSide ? 'text-gray-500' : 'text-blue-100'
            }`}>
              {card.russian}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
```

### 5.3 Генератор диалогов `src/components/DialogGenerator.tsx`:

```typescript
import React, { useState } from 'react';
import type { DialogGenerationSettings, DialogLevel, ParticipantGender } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useWordsStore } from '../store/wordsStore';

interface DialogGeneratorProps {
  onGenerate: (settings: DialogGenerationSettings) => void;
  isGenerating?: boolean;
}

export const DialogGenerator: React.FC<DialogGeneratorProps> = ({
  onGenerate,
  isGenerating = false
}) => {
  const { words } = useWordsStore();
  const [settings, setSettings] = useState<DialogGenerationSettings>({
    level: 'אלף',
    participantCount: 2,
    participants: [
      { id: '1', name: 'שרה', gender: 'female' },
      { id: '2', name: 'דוד', gender: 'male' }
    ],
    useExistingWords: true,
    includeNewWords: false,
    wordsToUse: [],
    topic: ''
  });

  const levels: DialogLevel[] = ['אלף', 'בית', 'גימל', 'דלת', 'הא'];
  
  const handleParticipantChange = (index: number, field: 'name' | 'gender', value: string) => {
    const newParticipants = [...settings.participants];
    newParticipants[index] = {
      ...newParticipants[index],
      [field]: value
    };
    setSettings({ ...settings, participants: newParticipants });
  };

  const handleParticipantCountChange = (count: 2 | 3) => {
    let participants = [...settings.participants];
    
    if (count === 3 && participants.length === 2) {
      participants.push({ id: '3', name: 'מירי', gender: 'female' });
    } else if (count === 2 && participants.length === 3) {
      participants = participants.slice(0, 2);
    }
    
    setSettings({ 
      ...settings, 
      participantCount: count,
      participants 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(settings);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Генератор диалогов
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Уровень сложности */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Уровень сложности
          </label>
          <Select 
            value={settings.level} 
            onValueChange={(value: DialogLevel) => setSettings({ ...settings, level: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map(level => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Количество участников */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Количество участников
          </label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={settings.participantCount === 2 ? "default" : "outline"}
              onClick={() => handleParticipantCountChange(2)}
            >
              2 участника
            </Button>
            <Button
              type="button"
              variant={settings.participantCount === 3 ? "default" : "outline"}
              onClick={() => handleParticipantCountChange(3)}
            >
              3 участника
            </Button>
          </div>
        </div>

        {/* Настройка участников */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Участники диалога
          </label>
          <div className="space-y-3">
            {settings.participants.map((participant, index) => (
              <div key={participant.id} className="flex gap-3">
                <Input
                  placeholder="Имя участника"
                  value={participant.name}
                  onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Select
                  value={participant.gender}
                  onValueChange={(value: ParticipantGender) => 
                    handleParticipantChange(index, 'gender', value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Мужской</SelectItem>
                    <SelectItem value="female">Женский</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Тема диалога */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тема диалога (опционально)
          </label>
          <Input
            placeholder="Например: В кафе, В магазине, Знакомство..."
            value={settings.topic}
            onChange={(e) => setSettings({ ...settings, topic: e.target.value })}
          />
        </div>

        {/* Настройки слов */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useExisting"
              checked={settings.useExistingWords}
              onChange={(e) => setSettings({ 
                ...settings, 
                useExistingWords: e.target.checked 
              })}
              className="h-4 w-4 text-blue-600 rounded mr-2"
            />
            <label htmlFor="useExisting" className="text-sm text-gray-700">
              Использовать слова из моей коллекции ({words.length} слов)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeNew"
              checked={settings.includeNewWords}
              onChange={(e) => setSettings({ 
                ...settings, 
                includeNewWords: e.target.checked 
              })}
              className="h-4 w-4 text-blue-600 rounded mr-2"
            />
            <label htmlFor="includeNew" className="text-sm text-gray-700">
              Включать новые слова соответствующего уровня
            </label>
          </div>
        </div>

        {/* Кнопка генерации */}
        <Button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isGenerating ? 'Генерируем диалог...' : 'Создать диалог'}
        </Button>
      </form>
    </div>
  );
};
```

### 5.4 Вкладка диалогов `src/components/DialogsTab.tsx`:

```typescript
import React, { useState } from 'react';
import type { Dialog, DialogLevel } from '../types';
import { DialogInterface } from './DialogInterface';
import { DialogGenerator } from './DialogGenerator';
import { DialogList } from './DialogList';
import { Statistics } from './Statistics';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface DialogsTabProps {
  dialogs: Dialog[];
  currentDialogIndex: number;
  onMarkAsLearned: (id: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onGenerate: (settings: DialogGenerationSettings) => void;
  isGenerating: boolean;
  dialogStats: DialogStats;
}

export const DialogsTab: React.FC<DialogsTabProps> = ({
  dialogs,
  currentDialogIndex,
  onMarkAsLearned,
  onNext,
  onPrevious,
  onGenerate,
  isGenerating,
  dialogStats
}) => {
  const [view, setView] = useState<'learn' | 'generate' | 'list'>('learn');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'learned' | 'not_learned'>('all');

  // Фильтрация диалогов
  const filteredDialogs = dialogs.filter(dialog => {
    const levelMatch = selectedLevel === 'all' || dialog.level === selectedLevel;
    let statusMatch = true;
    if (selectedStatus === 'learned') statusMatch = dialog.isLearned;
    if (selectedStatus === 'not_learned') statusMatch = !dialog.isLearned;
    return levelMatch && statusMatch;
  });

  const currentDialog = filteredDialogs[currentDialogIndex];
  const levels: DialogLevel[] = ['אלף', 'בית', 'גימל', 'דלת', 'הא'];

  const renderContent = () => {
    switch (view) {
      case 'learn':
        if (dialogs.length === 0) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                У вас пока нет диалогов
              </h3>
              <Button onClick={() => setView('generate')}>
                Создать первый диалог
              </Button>
            </div>
          );
        }

        if (filteredDialogs.length === 0) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Нет диалогов с выбранными фильтрами
              </h3>
              <Button onClick={() => { setSelectedLevel('all'); setSelectedStatus('all'); }}>
                Сбросить фильтры
              </Button>
            </div>
          );
        }

        if (!currentDialog) return null;

        return (
          <DialogInterface
            dialog={currentDialog}
            onMarkAsLearned={onMarkAsLearned}
            onNext={onNext}
            onPrevious={onPrevious}
            currentIndex={currentDialogIndex}
            totalDialogs={filteredDialogs.length}
          />
        );

      case 'generate':
        return (
          <DialogGenerator
            onGenerate={onGenerate}
            isGenerating={isGenerating}
          />
        );

      case 'list':
        return <DialogList dialogs={dialogs} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Навигация по режимам */}
      <div className="flex justify-center gap-4">
        <Button
          variant={view === 'learn' ? 'default' : 'outline'}
          onClick={() => setView('learn')}
        >
          Изучать
        </Button>
        <Button
          variant={view === 'generate' ? 'default' : 'outline'}
          onClick={() => setView('generate')}
        >
          Создать
        </Button>
        <Button
          variant={view === 'list' ? 'default' : 'outline'}
          onClick={() => setView('list')}
        >
          Список
        </Button>
      </div>

      {/* Статистика */}
      {view === 'learn' && dialogs.length > 0 && (
        <>
          <Statistics stats={dialogStats} />
          
          {/* Фильтры */}
          <div className="flex gap-4 justify-center">
            <div className="w-48">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Уровень" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все уровни</SelectItem>
                  {levels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-48">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="learned">Изученные</SelectItem>
                  <SelectItem value="not_learned">Не изученные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Основной контент */}
      {renderContent()}
    </div>
  );
};
```

## 6. Интеграция в основное приложение

### Обновление `src/App.tsx`:

```typescript
// Добавить импорты
import { useDialogsStore } from './store/dialogsStore';
import { DialogsTab } from './components/DialogsTab';

// Добавить в компонент App:
const {
  dialogs,
  currentDialogIndex,
  markDialogAsLearned,
  nextDialog,
  previousDialog,
  startDialogGeneration,
  isBackgroundProcessing: isDialogGenerating,
  getDialogStats
} = useDialogsStore();

// Обновить tabs массив:
const tabs = [
  // ... существующие табы
  {
    id: 'dialogs',
    label: 'Диалоги',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <title>Диалоги</title>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

// Добавить в renderContent():
case 'dialogs':
  return (
    <DialogsTab
      dialogs={dialogs}
      currentDialogIndex={currentDialogIndex}
      onMarkAsLearned={markDialogAsLearned}
      onNext={nextDialog}
      onPrevious={previousDialog}
      onGenerate={startDialogGeneration}
      isGenerating={isDialogGenerating}
      dialogStats={getDialogStats()}
    />
  );
```

## 7. Миграция и обратная совместимость

### 7.1 Версионирование данных:

```typescript
// src/utils/migration.ts
interface DataVersion {
  version: number;
  wordsData: Word[];
  dialogsData?: Dialog[];
}

export function migrateData(): void {
  const currentVersion = 2;
  const storedVersion = localStorage.getItem('data-version');
  
  if (!storedVersion || parseInt(storedVersion) < currentVersion) {
    // Выполнить необходимые миграции
    localStorage.setItem('data-version', currentVersion.toString());
  }
}
```

### 7.2 Graceful degradation:

- Приложение работает без диалогов
- Существующие данные остаются нетронутыми
- Новый функционал опционален

## 8. Преимущества архитектуры с отдельным стором

### 8.1 Преимущества:
1. **Четкое разделение ответственности** - каждый стор отвечает за свою область
2. **Лучшая производительность** - перерендеринг только при изменении соответствующих данных
3. **Упрощенное тестирование** - изолированное тестирование каждого стора
4. **Масштабируемость** - легко добавлять новые функции
5. **Независимое развитие** - изменения в одном сторе не влияют на другой

### 8.2 Минимизация дублирования:
1. **Общие утилиты** вынесены в отдельные модули
2. **Переиспользование типов** через common.ts
3. **Общие хуки** для toast, storage, background tasks
4. **Единая система компонентов UI**

## 9. План реализации

### Этап 1: Базовая структура
1. Создать новые типы данных
2. Создать dialogsStore
3. Создать общие утилиты

### Этап 2: Сервисы
1. Реализовать сервис генерации диалогов
2. Расширить TTS функционал
3. Интегрировать с OpenRouter

### Этап 3: UI компоненты
1. DialogInterface
2. DialogCard
3. DialogGenerator
4. DialogList

### Этап 4: Интеграция
1. Добавить вкладку в App.tsx
2. Настроить роутинг
3. Тестирование интеграции

### Этап 5: Полировка
1. Анимации и переходы
2. Оптимизация производительности
3. Доработка UX

## Заключение

Предложенная архитектура обеспечивает:
- Максимальную совместимость с существующим кодом
- Чистое разделение ответственности через отдельный стор
- Минимальное дублирование кода через общие утилиты
- Возможность независимого развития функционала диалогов
- Простоту тестирования и поддержки

Архитектура готова к реализации и может быть легко расширена в будущем.