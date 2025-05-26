import { useCallback, useEffect, useState } from 'react';

interface UseSpeechSynthesisProps {
  text: string;
  lang?: string;
  rate?: number;
}

export const useSpeechSynthesis = ({ text, lang = 'he-IL', rate }: UseSpeechSynthesisProps) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = 'speechSynthesis' in window;
    setIsSupported(supported);
    setIsLoading(false);
    if (!supported) {
      setError('Speech synthesis is not supported in this browser');
    }
  }, []);

  const speak = useCallback(() => {
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
      
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      // Speak the new text
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
    }
  }, [text, lang, rate, isSupported]);

  return {
    speak,
    isSupported,
    isLoading,
    error
  };
};