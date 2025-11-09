// Store for auto-play mode in FlashCard section
import { create } from 'zustand';

interface AutoModeState {
  isPlaying: boolean;
  currentPosition: number; // Index of current word in auto mode
  hebrewDelay: number; // Delay after Hebrew speech (ms)
  russianDelay: number; // Delay after Russian speech (ms)
  cardDelay: number; // Delay before next card (ms)
  
  // Actions
  play: () => void;
  stop: () => void;
  setPosition: (position: number) => void;
  nextPosition: (totalWords: number) => void;
  setHebrewDelay: (delay: number) => void;
  setRussianDelay: (delay: number) => void;
  setCardDelay: (delay: number) => void;
  reset: () => void;
}

const STORAGE_KEY = 'flashcards-auto-mode';

// Load saved state from localStorage
const loadAutoModeState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load auto mode state:', error);
  }
  return null;
};

// Save state to localStorage
const saveAutoModeState = (state: Partial<AutoModeState>) => {
  try {
    const current = loadAutoModeState() || {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch (error) {
    console.error('Failed to save auto mode state:', error);
  }
};

const initialState = {
  isPlaying: false,
  currentPosition: 0,
  hebrewDelay: 1500, // 1.5 seconds after Hebrew
  russianDelay: 2000, // 2 seconds after Russian
  cardDelay: 1000, // 1 second before next card
};

export const useAutoModeStore = create<AutoModeState>((set) => {
  // Load saved position on init
  const savedState = loadAutoModeState();
  const state = savedState ? { ...initialState, ...savedState, isPlaying: false } : initialState;

  return {
    ...state,

    play: () => {
      set({ isPlaying: true });
      saveAutoModeState({ isPlaying: true });
    },

    stop: () => {
      set({ isPlaying: false });
      saveAutoModeState({ isPlaying: false });
    },

    setPosition: (position: number) => {
      set({ currentPosition: position });
      saveAutoModeState({ currentPosition: position });
    },

    nextPosition: (totalWords: number) => {
      set((state) => {
        const nextPos = (state.currentPosition + 1) % totalWords;
        saveAutoModeState({ currentPosition: nextPos });
        return { currentPosition: nextPos };
      });
    },

    setHebrewDelay: (delay: number) => {
      set({ hebrewDelay: delay });
      saveAutoModeState({ hebrewDelay: delay });
    },

    setRussianDelay: (delay: number) => {
      set({ russianDelay: delay });
      saveAutoModeState({ russianDelay: delay });
    },

    setCardDelay: (delay: number) => {
      set({ cardDelay: delay });
      saveAutoModeState({ cardDelay: delay });
    },

    reset: () => {
      set({ currentPosition: 0, isPlaying: false });
      saveAutoModeState({ currentPosition: 0, isPlaying: false });
    },
  };
});
