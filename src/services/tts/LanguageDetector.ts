import type { LanguageDetector as ILanguageDetector } from './types';

export class LanguageDetector implements ILanguageDetector {
  detect(text: string): string {
    // Hebrew: Unicode range [\u0590-\u05FF]
    if (/[\u0590-\u05FF]/.test(text)) {
      return 'he-IL';
    }
    
    // Russian: Unicode range [\u0400-\u04FF]
    if (/[\u0400-\u04FF]/.test(text)) {
      return 'ru-RU';
    }
    
    // English: only Latin characters and basic punctuation
    if (/^[a-zA-Z\s.,!?'"()-]+$/.test(text)) {
      return 'en-US';
    }
    
    // Default fallback to Hebrew (main language of the app)
    return 'he-IL';
  }
}