import { useCallback, useEffect, useState, useRef } from 'react';
import type { DialogCard, DialogParticipant } from '../types';

export interface TTSQueueItem {
  id: string;
  text: string;
  participant: DialogParticipant;
  cardIndex: number;
}

export interface DialogSpeechState {
  isPlaying: boolean;
  currentCardIndex: number;
  queue: TTSQueueItem[];
  isPaused: boolean;
  availableVoices: SpeechSynthesisVoice[];
}

export interface UseDialogSpeechProps {
  cards: DialogCard[];
  participants: DialogParticipant[];
  autoPlay?: boolean;
  playbackSpeed?: number;
}

export const useDialogSpeech = ({ 
  cards, 
  participants, 
  autoPlay = false,
  playbackSpeed = 1 
}: UseDialogSpeechProps) => {
  const [state, setState] = useState<DialogSpeechState>({
    isPlaying: false,
    currentCardIndex: -1,
    queue: [],
    isPaused: false,
    availableVoices: []
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if speech synthesis is supported
  const isSupported = 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setState(prev => ({ ...prev, availableVoices: voices }));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Build queue from cards
  const buildQueue = useCallback((): TTSQueueItem[] => {
    return cards.map((card, index) => {
      const participant = participants.find(p => p.id === card.speaker);
      if (!participant) {
        console.warn(`Participant not found for card ${card.id}`);
        return null;
      }

      return {
        id: card.id,
        text: card.hebrew,
        participant,
        cardIndex: index
      };
    }).filter((item): item is TTSQueueItem => item !== null);
  }, [cards, participants]);

  // Get voice for participant
  const getVoiceForParticipant = useCallback((participant: DialogParticipant): SpeechSynthesisVoice | null => {
    const availableVoices = state.availableVoices;
    
    // Try to find Hebrew voice matching participant's gender
    const hebrewVoices = availableVoices.filter(voice =>
      voice.lang.startsWith('he') || voice.lang.startsWith('iw')
    );

    if (hebrewVoices.length > 0) {
      // Try to match gender-specific voice names
      const genderSpecificVoice = hebrewVoices.find(voice => {
        const name = voice.name.toLowerCase();
        return participant.gender === 'female'
          ? name.includes('female') || name.includes('woman') || name.includes('שרה') || name.includes('רחל')
          : name.includes('male') || name.includes('man') || name.includes('דוד') || name.includes('יוסי');
      });

      return genderSpecificVoice || hebrewVoices[0];
    }

    // Fallback to any available voice
    return availableVoices[0] || null;
  }, [state.availableVoices]);

  // Play single card
  const playCard = useCallback((queueItem: TTSQueueItem): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(queueItem.text);
      utteranceRef.current = utterance;

      // Configure utterance
      utterance.lang = 'he-IL';
      utterance.rate = playbackSpeed;
      
      // Apply participant voice settings
      const voice = getVoiceForParticipant(queueItem.participant);
      if (voice) {
        utterance.voice = voice;
      }

      // Apply participant-specific voice settings
      if (queueItem.participant.voiceSettings) {
        const settings = queueItem.participant.voiceSettings;
        utterance.pitch = settings.pitch || 1;
        utterance.rate = (settings.rate || 1) * playbackSpeed;
        utterance.volume = settings.volume || 1;
      }

      // Set up event handlers
      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);
    });
  }, [isSupported, playbackSpeed, getVoiceForParticipant]);

  // Play entire dialog
  const playDialog = useCallback(async (startFromIndex = 0) => {
    if (!isSupported) {
      console.error('Speech synthesis not supported');
      return;
    }

    const queue = buildQueue();
    if (queue.length === 0) {
      console.warn('No cards to play');
      return;
    }

    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      queue,
      currentCardIndex: startFromIndex
    }));

    try {
      for (let i = startFromIndex; i < queue.length; i++) {
        // Check if playback was stopped or paused
        if (!state.isPlaying || state.isPaused) {
          break;
        }

        setState(prev => ({ ...prev, currentCardIndex: i }));

        await playCard(queue[i]);

        // Add small pause between cards
        if (i < queue.length - 1) {
          await new Promise(resolve => {
            timeoutRef.current = setTimeout(resolve, 500);
          });
        }
      }
    } catch (error) {
      console.error('Dialog playback error:', error);
    } finally {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentCardIndex: -1,
        isPaused: false
      }));
    }
  }, [isSupported, buildQueue, playCard, state.isPlaying, state.isPaused]);

  // Play single card by index
  const playSingleCard = useCallback(async (cardIndex: number) => {
    const queue = buildQueue();
    if (cardIndex < 0 || cardIndex >= queue.length) {
      console.error('Invalid card index');
      return;
    }

    setState(prev => ({
      ...prev,
      currentCardIndex: cardIndex,
      isPlaying: true
    }));

    try {
      await playCard(queue[cardIndex]);
    } catch (error) {
      console.error('Single card playback error:', error);
    } finally {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentCardIndex: -1
      }));
    }
  }, [buildQueue, playCard]);

  // Stop playback
  const stopPlayback = useCallback(() => {
    window.speechSynthesis.cancel();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentCardIndex: -1
    }));
  }, []);

  // Pause playback
  const pausePlayback = useCallback(() => {
    if (state.isPlaying) {
      window.speechSynthesis.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isPlaying]);

  // Resume playback
  const resumePlayback = useCallback(() => {
    if (state.isPaused) {
      window.speechSynthesis.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isPaused]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && cards.length > 0 && !state.isPlaying) {
      playDialog();
    }
  }, [autoPlay, cards.length, playDialog, state.isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  return {
    // State
    isSupported,
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    currentCardIndex: state.currentCardIndex,
    availableVoices: state.availableVoices,
    
    // Actions
    playDialog,
    playSingleCard,
    stopPlayback,
    pausePlayback,
    resumePlayback,
    
    // Helpers
    getVoiceForParticipant,
    queue: state.queue
  };
};