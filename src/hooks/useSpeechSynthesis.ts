import { useCallback, useEffect, useState } from 'react';
import { getTTSManager } from '../services/tts/TTSManager';

interface UseSpeechSynthesisProps {
  text: string;
  lang?: string;
  rate?: number;
  voice?: string;
}

export const useSpeechSynthesis = ({ text, lang = 'he-IL', rate, voice }: UseSpeechSynthesisProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);
    setIsLoading(false);
    if (!supported) {
      setError('Speech synthesis is not supported in this browser');
    } else {
      // Load available voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      
      loadVoices();
      // Some browsers load voices asynchronously
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback(async () => {
    if (!isSupported) {
      setError('Speech synthesis is not supported');
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      
      // Set speech rate from settings or use default
      const speechRate = rate ?? parseFloat(localStorage.getItem('speechRate') || '1');
      utterance.rate = Math.max(0.1, Math.min(10, speechRate)); // Clamp between 0.1 and 10
      
      // Set voice from settings or parameter
      const selectedVoiceName = voice ?? localStorage.getItem('speechVoice');
      if (selectedVoiceName && selectedVoiceName !== 'default') {
        const selectedVoice = availableVoices.find(v => v.name === selectedVoiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      // Stop any ongoing speech
      const ttsManager = getTTSManager();
      ttsManager.stop();
      
      // Speak using TTS manager
      await ttsManager.speak(text, {
        lang,
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume,
        voice: utterance.voice?.name
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
    }
  }, [text, lang, rate, voice, availableVoices, isSupported]);

  return {
    speak,
    isSupported,
    isLoading,
    error,
    availableVoices
  };
};