import { useCallback, useEffect, useState } from 'react';

interface UseSpeechSynthesisProps {
  text: string;
  lang?: string;
}

export const useSpeechSynthesis = ({ text, lang = 'he-IL' }: UseSpeechSynthesisProps) => {
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
      
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      // Speak the new text
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to speak text');
    }
  }, [text, lang, isSupported]);

  return {
    speak,
    isSupported,
    isLoading,
    error
  };
};