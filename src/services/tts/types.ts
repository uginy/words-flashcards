export type TTSProviderType = 'system' | 'microsoft' | 'elevenlabs' | 'google';

export interface TTSConfig {
  provider: TTSProviderType;
  fallbackToSystem: boolean;
  cacheEnabled: boolean;
  microsoftApiKey?: string;
  microsoftRegion?: string;
}

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}

export interface TTSProvider {
  readonly name: TTSProviderType;
  readonly isAvailable: boolean;
  
  speak(text: string, options: TTSOptions): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  getAvailableVoices(): Promise<TTSVoice[]>;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female';
  provider: TTSProviderType;
}

export interface TTSCacheEntry {
  audioData: ArrayBuffer;
  timestamp: number;
  provider: TTSProviderType;
}

export interface TTSError {
  code: 'PROVIDER_UNAVAILABLE' | 'API_ERROR' | 'NETWORK_ERROR' | 'UNSUPPORTED_LANGUAGE';
  message: string;
  provider: TTSProviderType;
}

// Language detection
export interface LanguageDetector {
  detect(text: string): string;
}

// SSML builder for Microsoft TTS
export interface SSMLBuilder {
  buildSSML(text: string, options: TTSOptions): string;
}