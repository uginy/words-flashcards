import { create } from 'zustand';
import type {
  Dialog,
  DialogBackgroundTask,
  DialogGenerationSettings,
  DialogStats,
  DialogPlaybackState,
  DialogLearningProgress,
  DialogFilter,
  ToastFunction
} from '../types';
import { generateDialog } from '../services/dialogGeneration';
import { generateSimpleEmojiAvatar } from '../utils/avatarGenerator';
import { DEFAULT_OPENROUTER_API_KEY, DEFAULT_OPENROUTER_MODEL } from '../config/openrouter';

const DIALOGS_STORAGE_KEY = 'flashcards-dialogs';

// Storage utilities for dialogs
const saveDialogsToStorage = (dialogs: Dialog[]): void => {
  try {
    if (dialogs.length === 0) {
      localStorage.removeItem(DIALOGS_STORAGE_KEY);
    } else {
      localStorage.setItem(DIALOGS_STORAGE_KEY, JSON.stringify(dialogs));
    }
  } catch (error) {
    console.error('Error saving dialogs to localStorage:', error);
  }
};

const loadDialogsFromStorage = (): Dialog[] => {
  try {
    const data = localStorage.getItem(DIALOGS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading dialogs from localStorage:', error);
    return [];
  }
};

// Function to calculate dialog statistics
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
  }, {} as Record<string, number>) as Record<import('../types').DialogLevel, number>;
  
  return {
    total,
    learned,
    remaining: total - learned,
    needReview,
    levelDistribution
  };
}

interface DialogsStore {
  // State from DialogsState
  dialogs: Dialog[];
  currentDialogIndex: number;
  backgroundTasks: DialogBackgroundTask[];
  isBackgroundProcessing: boolean;
  generationSettings: DialogGenerationSettings | null;
  
  // Additional state
  currentDialog: Dialog | null;
  playbackState: DialogPlaybackState;
  
  // Basic dialog management methods
  loadDialogs: () => void;
  addDialog: (dialog: Dialog) => void;
  updateDialog: (id: string, updates: Partial<Dialog>) => void;
  deleteDialog: (id: string) => void;
  
  // Dialog generation methods
  generateDialog: (settings: DialogGenerationSettings, toast: ToastFunction) => Promise<void>;
  
  // Learning methods
  startDialog: (id: string) => void;
  markCardAsHeard: (cardId: string) => void;
  updateDialogProgress: (id: string, progress: DialogLearningProgress) => void;
  getFilteredDialogs: (filter: DialogFilter) => Dialog[];
  
  // Playback control methods
  playCard: (cardId: string) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  
  // Background task management
  cancelDialogGeneration: (taskId: string) => void;
  clearCompletedTasks: () => void;
  
  // Utility methods
  getDialogStats: () => DialogStats;
  getCurrentDialog: () => Dialog | undefined;
  replaceAllDialogs: (dialogs: Dialog[], toast: ToastFunction) => void;
  clearAllDialogs: (toast: ToastFunction) => void;
  generateMissingAvatars: () => void;
  
  // Navigation methods
  nextDialog: () => void;
  previousDialog: () => void;
  markDialogAsLearned: (id: string) => void;
  markDialogAsNotLearned: (id: string) => void;
  resetDialogProgress: (id: string) => void;
}

export const useDialogsStore = create<DialogsStore>((set, get) => {
  // Load data from localStorage on initialization
  const storedDialogs = loadDialogsFromStorage();

  // Sync to localStorage when dialogs change
  const syncToStorage = (dialogs: Dialog[]) => {
    saveDialogsToStorage(dialogs);
  };

  return {
    // Initial state
    dialogs: storedDialogs,
    currentDialogIndex: 0,
    backgroundTasks: [],
    isBackgroundProcessing: false,
    generationSettings: null,
    currentDialog: null,
    playbackState: {
      isPlaying: false,
      currentCardIndex: 0,
      autoPlay: false,
      playbackSpeed: 1.0,
      repeatCard: false,
    },

    loadDialogs: () => {
      const storedDialogs = loadDialogsFromStorage();
      set(state => ({ ...state, dialogs: storedDialogs }));
    },

    addDialog: (dialog) => {
      set(state => {
        const newDialogs = [...state.dialogs, dialog];
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },

    updateDialog: (id, updates) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog =>
          dialog.id === id ? { ...dialog, ...updates } : dialog
        );
        syncToStorage(newDialogs);
        
        // Update current dialog if it's the one being updated
        const updatedCurrentDialog = state.currentDialog?.id === id 
          ? { ...state.currentDialog, ...updates }
          : state.currentDialog;
        
        return { 
          dialogs: newDialogs,
          currentDialog: updatedCurrentDialog
        };
      });
    },

    deleteDialog: (id) => {
      set(state => {
        const newDialogs = state.dialogs.filter(dialog => dialog.id !== id);
        syncToStorage(newDialogs);
        
        // Reset current dialog if it was deleted
        const newCurrentDialog = state.currentDialog?.id === id ? null : state.currentDialog;
        
        return { 
          dialogs: newDialogs,
          currentDialog: newCurrentDialog,
          currentDialogIndex: Math.min(state.currentDialogIndex, newDialogs.length - 1)
        };
      });
    },

    generateDialog: async (settings, toast) => {
      const taskId = Date.now().toString();
      
      // Create generation task
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
        // Update status to running
        set(state => ({
          backgroundTasks: state.backgroundTasks.map(t =>
            t.id === taskId ? { ...t, status: 'running' as const } : t
          )
        }));

        toast({
          title: 'Генерация диалога',
          description: 'Создаем диалог с помощью LLM...',
          variant: 'info'
        });

        // Get API credentials
        const apiKey = localStorage.getItem('openRouterApiKey') || DEFAULT_OPENROUTER_API_KEY;
        const model = localStorage.getItem('openRouterModel') || DEFAULT_OPENROUTER_MODEL;
        
        if (!apiKey || !model || apiKey === "YOUR_DEFAULT_API_KEY_HERE") {
          throw new Error('OpenRouter API key или model не настроены. Проверьте настройки.');
        }

        // Generate dialog using LLM
        const dialog = await generateDialog(
          settings,
          apiKey,
          model,
          {
            abortController: task.abortController,
            onProgress: (progress) => {
              set(state => ({
                backgroundTasks: state.backgroundTasks.map(t =>
                  t.id === taskId ? { ...t, progress } : t
                )
              }));
            }
          }
        );

        // Check if task was cancelled
        const currentState = get();
        const currentTask = currentState.backgroundTasks.find(t => t.id === taskId);
        if (currentTask?.cancelled) {
          return;
        }

        // Add dialog to collection
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

    startDialog: (id) => {
      const dialog = get().dialogs.find(d => d.id === id);
      if (dialog) {
        set(state => ({
          currentDialog: dialog,
          playbackState: {
            ...state.playbackState,
            currentCardIndex: 0,
            isPlaying: false
          }
        }));
      }
    },

    markCardAsHeard: (cardId) => {
      // TODO: Implement card tracking logic
      console.log('Card marked as heard:', cardId);
    },

    updateDialogProgress: (id, progress) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog => {
          if (dialog.id === id) {
            // Update learning stage based on progress
            const completionRate = progress.correctAnswers / progress.totalCards;
            let newStage = dialog.learningStage;
            
            if (completionRate >= 0.8) {
              newStage = Math.min((dialog.learningStage || 0) + 1, 5);
            }
            
            // Calculate next review interval
            const intervals = [0, 1, 3, 7, 14, 30]; // days
            const nextReview = Date.now() + (intervals[newStage] * 24 * 60 * 60 * 1000);
            
            return {
              ...dialog,
              learningStage: newStage,
              isLearned: newStage > 0,
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

    getFilteredDialogs: (filter) => {
      const { dialogs } = get();
      
      return dialogs.filter(dialog => {
        if (filter.level && dialog.level !== filter.level) return false;
        if (filter.isLearned !== undefined && dialog.isLearned !== filter.isLearned) return false;
        if (filter.needsReview && (!dialog.nextReview || dialog.nextReview > Date.now())) return false;
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          return dialog.title.toLowerCase().includes(searchLower) ||
                 dialog.titleRu.toLowerCase().includes(searchLower);
        }
        if (filter.dateRange) {
          return dialog.dateAdded >= filter.dateRange.from && dialog.dateAdded <= filter.dateRange.to;
        }
        return true;
      });
    },

    playCard: (cardId) => {
      const { currentDialog } = get();
      if (!currentDialog) return;
      
      const cardIndex = currentDialog.cards.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
        set(state => ({
          playbackState: {
            ...state.playbackState,
            currentCardIndex: cardIndex,
            isPlaying: true
          }
        }));
      }
    },

    pausePlayback: () => {
      set(state => ({
        playbackState: {
          ...state.playbackState,
          isPlaying: false
        }
      }));
    },

    resumePlayback: () => {
      set(state => ({
        playbackState: {
          ...state.playbackState,
          isPlaying: true
        }
      }));
    },

    stopPlayback: () => {
      set(state => ({
        playbackState: {
          ...state.playbackState,
          isPlaying: false,
          currentCardIndex: 0
        }
      }));
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
      const { dialogs } = get();
      return getDialogStats(dialogs);
    },

    getCurrentDialog: () => {
      const { dialogs, currentDialogIndex } = get();
      return dialogs[currentDialogIndex];
    },

    replaceAllDialogs: (newDialogs, toast) => {
      set(() => {
        syncToStorage(newDialogs);
        toast({
          title: 'Диалоги заменены',
          description: `Загружено ${newDialogs.length} диалогов`,
          variant: 'success'
        });
        return {
          dialogs: newDialogs,
          currentDialogIndex: 0,
          currentDialog: null
        };
      });
    },

    clearAllDialogs: (toast) => {
      set(() => {
        syncToStorage([]);
        toast({
          title: 'Все диалоги удалены',
          description: 'Коллекция диалогов очищена',
          variant: 'info'
        });
        return {
          dialogs: [],
          currentDialogIndex: 0,
          currentDialog: null
        };
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

    markDialogAsLearned: (id) => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog => {
          if (dialog.id === id) {
            const newStage = Math.min((dialog.learningStage || 0) + 1, 5);
            const intervals = [0, 1, 3, 7, 14, 30]; // days
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

    generateMissingAvatars: () => {
      set(state => {
        const newDialogs = state.dialogs.map(dialog => ({
          ...dialog,
          participants: dialog.participants.map(participant => ({
            ...participant,
            avatar: participant.avatar || generateSimpleEmojiAvatar(participant.name, participant.gender)
          }))
        }));
        syncToStorage(newDialogs);
        return { dialogs: newDialogs };
      });
    },
  };
});

// Export current dialog getter utility
export function getCurrentDialog(dialogs: Dialog[], currentDialogIndex: number): Dialog | undefined {
  return dialogs[currentDialogIndex];
}

// Storage event listener for cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === DIALOGS_STORAGE_KEY && event.newValue) {
      try {
        const newDialogs = JSON.parse(event.newValue);
        useDialogsStore.setState(state => ({ ...state, dialogs: newDialogs }));
      } catch (error) {
        console.error('Failed to parse dialogs from localStorage:', error);
      }
    }
  });
}