export type TTSProviderType = 'system' | 'microsoft' | 'elevenlabs' | 'google';

export interface TTSConfig {
  provider: TTSProviderType;
  fallbackToSystem: boolean;
  cacheEnabled: boolean;
  microsoftApiKey?: string;
  microsoftRegion?: string;
  // Microsoft TTS specific options
  speechRate?: number; // 0.5 to 2.0, default 1.0
  speechPitch?: number; // 0.5 to 2.0, default 1.0  
  speechVolume?: number; // 0.0 to 1.0, default 1.0
  voiceStyle?: string; // emotional styles like 'cheerful', 'sad', etc.
  voiceRole?: string; // role-play styles like 'narrator', 'customer-service', etc.
}

export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
  gender?: 'male' | 'female';
}

export interface TTSProvider {
  readonly name: TTSProviderType;
  readonly isAvailable: boolean;
  
  speak(text: string, options: TTSOptions): Promise<void>;
  synthesize?(text: string, options: TTSOptions): Promise<ArrayBuffer>;
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
