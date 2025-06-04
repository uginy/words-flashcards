import type { TTSProvider, TTSOptions, TTSVoice } from '../types';

export class SystemTTSProvider implements TTSProvider {
  readonly name = 'system' as const;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  get isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.isAvailable) {
      throw new Error('Speech synthesis is not supported in this browser');
    }

    return new Promise((resolve, reject) => {
      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Apply options
      utterance.lang = options.lang || 'he-IL';
      utterance.rate = Math.max(0.1, Math.min(10, options.rate || 1));
      utterance.pitch = Math.max(0, Math.min(2, options.pitch || 1));
      utterance.volume = Math.max(0, Math.min(1, options.volume || 1));

      // Set voice if specified
      if (options.voice) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Set up event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        if (event.error === 'not-allowed') {
          reject(new Error('Speech synthesis requires user interaction. Please click on the page first.'));
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      // Start speaking with error handling
      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        this.currentUtterance = null;
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.isAvailable) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  pause(): void {
    if (this.isAvailable) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (this.isAvailable) {
      window.speechSynthesis.resume();
    }
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    if (!this.isAvailable) {
      return [];
    }

    return new Promise((resolve) => {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const ttsVoices: TTSVoice[] = voices.map(voice => ({
          id: voice.name,
          name: voice.name,
          language: voice.lang,
          gender: this.detectGender(voice.name),
          provider: 'system'
        }));
        resolve(ttsVoices);
      };

      // Voices might be loaded asynchronously
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        loadVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    });
  }

  private detectGender(voiceName: string): 'male' | 'female' | undefined {
    const name = voiceName.toLowerCase();
    
    // Common patterns for gender detection
    if (name.includes('female') || name.includes('woman') || 
        name.includes('שרה') || name.includes('רחל') ||
        name.includes('jenny') || name.includes('zira')) {
      return 'female';
    }
    
    if (name.includes('male') || name.includes('man') || 
        name.includes('דוד') || name.includes('יוסי') ||
        name.includes('david') || name.includes('mark')) {
      return 'male';
    }
    
    return undefined;
  }
}