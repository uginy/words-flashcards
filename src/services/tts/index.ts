export { TTSManager, getTTSManager } from './TTSManager';
export { SystemTTSProvider } from './providers/SystemTTSProvider';
export { MicrosoftTTSProvider } from './providers/MicrosoftTTSProvider';
export { LanguageDetector } from './LanguageDetector';
export type {
  TTSProvider,
  TTSConfig,
  TTSOptions,
  TTSVoice,
  TTSProviderType,
  TTSCacheEntry,
  TTSError,
  LanguageDetector as ILanguageDetector,
  SSMLBuilder
} from './types';

// Helper functions for cache management
import { getTTSManager as getTTSManagerInternal } from './TTSManager';

export const clearTTSCacheForGender = (gender: 'male' | 'female') => {
  const ttsManager = getTTSManagerInternal();
  return ttsManager.clearCacheForGender(gender);
};

export const clearAllTTSCache = () => {
  const ttsManager = getTTSManagerInternal();
  ttsManager.clearCache();
};