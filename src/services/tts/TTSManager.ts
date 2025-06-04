import type { TTSProvider, TTSConfig, TTSOptions, TTSVoice, TTSCacheEntry } from './types';
import { SystemTTSProvider } from './providers/SystemTTSProvider';
import { MicrosoftTTSProvider } from './providers/MicrosoftTTSProvider';
import { LanguageDetector } from './LanguageDetector';

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
      await this.currentProvider.speak(text, options);
      
      // Cache successful synthesis (for audio providers)
      if (this.config.cacheEnabled && this.currentProvider.name !== 'system') {
        // Note: Actual caching would be implemented here for audio providers
        // For now, we just mark it as cached
      }
      
    } catch (error) {
      console.error(`TTS error with ${this.currentProvider.name}:`, error);
      
      // Fallback to system provider if enabled
      if (this.config.fallbackToSystem && this.currentProvider.name !== 'system') {
        console.log('Falling back to system TTS');
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

  private loadConfig(): TTSConfig {
    const saved = localStorage.getItem('tts_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse TTS config:', error);
      }
    }
    
    // Default configuration
    return {
      provider: 'system',
      fallbackToSystem: true,
      cacheEnabled: true
    };
  }

  private registerProvider(provider: TTSProvider): void {
    this.providers.set(provider.name, provider);
  }

  private updateProviders(): void {
    // Update Microsoft provider if config changed
    if (this.config.microsoftApiKey && this.config.microsoftRegion) {
      const microsoftProvider = new MicrosoftTTSProvider(
        this.config.microsoftApiKey,
        this.config.microsoftRegion
      );
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
    const optionsHash = JSON.stringify({
      lang: options.lang,
      rate: options.rate,
      pitch: options.pitch,
      voice: options.voice
    });
    return `${this.currentProvider.name}-${text}-${btoa(optionsHash)}`;
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
}

// Export singleton instance getter
export const getTTSManager = () => TTSManager.getInstance();