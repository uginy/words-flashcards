import type { TTSProvider, TTSConfig, TTSOptions, TTSVoice, TTSCacheEntry } from './types';
import { SystemTTSProvider } from './providers/SystemTTSProvider';
import { MicrosoftTTSProvider } from './providers/MicrosoftTTSProvider';
import { LanguageDetector } from './LanguageDetector';
import { getMicrosoftApiKey } from '../../utils/apiKeys';

export class TTSManager {
  private static instance: TTSManager | null = null;
  private providers = new Map<string, TTSProvider>();
  private currentProvider: TTSProvider;
  private cache = new Map<string, TTSCacheEntry>();
  private languageDetector = new LanguageDetector();
  private config: TTSConfig;

  private constructor() {
    // Initialize with default config
    this.config = this.loadConfig();
    
    // Register providers
    this.registerProvider(new SystemTTSProvider());
    
    // Initialize additional providers based on config
    this.updateProviders();
    
    // Set initial provider
    this.currentProvider = this.providers.get('system') || new SystemTTSProvider();
    this.updateCurrentProvider();
    
    // Clean expired cache on startup
    this.clearExpiredCache();
  }

  static getInstance(): TTSManager {
    if (!TTSManager.instance) {
      TTSManager.instance = new TTSManager();
    }
    return TTSManager.instance;
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!text.trim()) {
      return;
    }

    // Auto-detect language if not provided
    if (!options.lang) {
      options.lang = this.languageDetector.detect(text);
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(text, options);
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        await this.playFromCache(cached);
        return;
      }
    }

    try {
      // Try current provider
      if (this.currentProvider.name === 'system') {
        // System TTS doesn't support caching
        await this.currentProvider.speak(text, options);
      } else {
        // For audio providers, use caching
        await this.speakWithCaching(text, options);
      }
      
    } catch (error) {
      console.error(`TTS error with ${this.currentProvider.name}:`, error);
      
      // Fallback to system provider if enabled
      if (this.config.fallbackToSystem && this.currentProvider.name !== 'system') {
        const systemProvider = this.providers.get('system');
        if (systemProvider) {
          await systemProvider.speak(text, options);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  stop(): void {
    this.currentProvider.stop();
  }

  pause(): void {
    this.currentProvider.pause();
  }

  resume(): void {
    this.currentProvider.resume();
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    const voices: TTSVoice[] = [];
    
    // Get voices from all available providers
    for (const provider of this.providers.values()) {
      if (provider.isAvailable) {
        const providerVoices = await provider.getAvailableVoices();
        voices.push(...providerVoices);
      }
    }
    
    return voices;
  }

  getConfig(): TTSConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<TTSConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Save to localStorage
    localStorage.setItem('tts_config', JSON.stringify(this.config));
    
    // Update providers if needed
    this.updateProviders();
    this.updateCurrentProvider();
    
    // Clear cache if provider changed
    if (newConfig.provider && newConfig.provider !== this.currentProvider.name) {
      this.clearCache();
    }
  }

  getCurrentProvider(): TTSProvider {
    return this.currentProvider;
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearCacheForGender(gender: 'male' | 'female'): number {
    let removedCount = 0;
    
    for (const [key] of this.cache.entries()) {
      // Parse the cache key to check if it contains the gender
      try {
        const parts = key.split('-');
        if (parts.length >= 3) {
          const optionsBase64 = parts[parts.length - 1];
          const optionsJson = atob(optionsBase64);
          const options = JSON.parse(optionsJson);
          
          if (options.gender === gender) {
            this.cache.delete(key);
            removedCount++;
          }
        }
      } catch {
        // Skip malformed cache keys
      }
    }
    
    return removedCount;
  }

  getCacheStats(): { size: number; entries: Array<{ key: string; timestamp: number; provider: string }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      provider: entry.provider
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }

  clearExpiredCache(maxAgeMs: number = 24 * 60 * 60 * 1000): number { // Default: 24 hours
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAgeMs) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  private loadConfig(): TTSConfig {
    const saved = localStorage.getItem('tts_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        // Ensure microsoftRegion always has a default value
        if (!config.microsoftRegion) {
          config.microsoftRegion = 'westeurope';
        }
        return config;
      } catch (error) {
        console.error('Failed to parse TTS config:', error);
      }
    }
    
    // Default configuration
    return {
      provider: 'system',
      fallbackToSystem: true,
      cacheEnabled: false,
      microsoftRegion: 'westeurope'
    };
  }

  private registerProvider(provider: TTSProvider): void {
    this.providers.set(provider.name, provider);
  }

  private updateProviders(): void {
    // Update Microsoft provider - use fallback API key if user hasn't set one
    const apiKey = this.config.microsoftApiKey || getMicrosoftApiKey();
    const region = this.config.microsoftRegion || 'westeurope';
    
    if (apiKey && region) {
      const microsoftProvider = new MicrosoftTTSProvider(apiKey, region);
      this.registerProvider(microsoftProvider);
    }
  }

  private updateCurrentProvider(): void {
    const provider = this.providers.get(this.config.provider);
    
    if (provider?.isAvailable) {
      this.currentProvider = provider;
    } else {
      // Fallback to system provider
      const systemProvider = this.providers.get('system');
      if (systemProvider) {
        this.currentProvider = systemProvider;
        if (this.config.provider !== 'system') {
          console.warn(`Provider ${this.config.provider} not available, falling back to system`);
        }
      } else {
        throw new Error('No TTS providers available');
      }
    }
  }

  private generateCacheKey(text: string, options: TTSOptions): string {
    // Ensure consistent ordering and include all relevant options for cache key
    const cacheOptions = {
      lang: options.lang || 'he-IL',
      rate: options.rate || 1.0,
      pitch: options.pitch || 1.0,
      voice: options.voice || '',
      gender: options.gender || 'female'
    };
    
    const optionsHash = JSON.stringify(cacheOptions, Object.keys(cacheOptions).sort());
    const cacheKey = `${this.currentProvider.name}-${text}-${btoa(optionsHash)}`;
    
    return cacheKey;
  }

  private async playFromCache(cached: TTSCacheEntry): Promise<void> {
    // For cached audio data, create and play audio element
    return new Promise((resolve, reject) => {
      const blob = new Blob([cached.audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Cached audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }

  private async speakWithCaching(text: string, options: TTSOptions): Promise<void> {
    const cacheKey = this.generateCacheKey(text, options);
    
    // Check cache first
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        await this.playFromCache(cached);
        return;
      }
    }

    // Synthesize audio using provider-specific method
    const audioBuffer = await this.synthesizeAudio(text, options);
    
    // Cache the result
    if (this.config.cacheEnabled) {
      const cacheEntry: TTSCacheEntry = {
        audioData: audioBuffer,
        timestamp: Date.now(),
        provider: this.currentProvider.name
      };
      this.cache.set(cacheKey, cacheEntry);
    }

    // Play the audio
    await this.playAudioBuffer(audioBuffer);
  }

  private async synthesizeAudio(text: string, options: TTSOptions): Promise<ArrayBuffer> {
    // Check if provider supports synthesis method
    if (this.currentProvider.synthesize) {
      return await this.currentProvider.synthesize(text, options);
    }
    
    throw new Error(`Caching not supported for provider: ${this.currentProvider.name}`);
  }

  private async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }
}

// Export singleton instance getter
export const getTTSManager = () => TTSManager.getInstance();
