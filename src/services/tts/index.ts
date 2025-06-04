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