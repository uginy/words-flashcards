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
  private currentAudio: HTMLAudioElement | null = null;
  private currentPlaybackController: AbortController | null = null;

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

    // Stop any current playback first
    this.stop();

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
    console.log('🛑 TTSManager.stop() called');
    
    // Stop provider
    console.log('🛑 Stopping current provider:', this.currentProvider.name);
    this.currentProvider.stop();
    
    // Stop any manager-level audio playback
    if (this.currentPlaybackController) {
      console.log('🛑 Aborting playback controller');
      this.currentPlaybackController.abort();
      this.currentPlaybackController = null;
    } else {
      console.log('🛑 No playback controller to abort');
    }
    
    if (this.currentAudio) {
      console.log('🛑 Stopping current audio element');
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    } else {
      console.log('🛑 No audio element to stop');
    }
    
    console.log('🛑 TTSManager.stop() completed');
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
        // Ensure speech parameters have default values
        if (config.speechRate === undefined) {
          config.speechRate = 'medium';
        }
        if (config.speechPitch === undefined) {
          config.speechPitch = 'medium';
        }
        if (config.speechVolume === undefined) {
          config.speechVolume = 'medium';
        }
        if (config.voiceStyle === undefined) {
          config.voiceStyle = '';
        }
        if (config.voiceRole === undefined) {
          config.voiceRole = '';
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
      microsoftRegion: 'westeurope',
      speechRate: 'medium',
      speechPitch: 'medium',
      speechVolume: 'medium',
      voiceStyle: '',
      voiceRole: ''
    };
  }

  private registerProvider(provider: TTSProvider): void {
    this.providers.set(provider.name, provider);
  }

  private updateProviders(): void {
    // Update Microsoft provider if config changed
    if (this.config.microsoftApiKey && this.config.microsoftRegion) {
      const microsoftConfig = {
        speechRate: this.config.speechRate,
        speechPitch: this.config.speechPitch,
        speechVolume: this.config.speechVolume,
        voiceStyle: this.config.voiceStyle,
        voiceRole: this.config.voiceRole
      };
      
      const microsoftProvider = new MicrosoftTTSProvider(
        this.config.microsoftApiKey,
        this.config.microsoftRegion,
        microsoftConfig
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
    return new Promise((resolve) => {
      const controller = new AbortController();
      this.currentPlaybackController = controller;
      
      const blob = new Blob([cached.audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (this.currentPlaybackController === controller) {
          this.currentPlaybackController = null;
        }
      };

      // Listen for abort signal
      controller.signal.addEventListener('abort', () => {
        cleanup();
        resolve();
      });

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        console.warn('Cached audio playback error - continuing anyway');
        resolve();
      };

      audio.play().catch((error: Error) => {
        console.warn('Audio play error:', error.message);
        cleanup();
        resolve();
      });
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
    return new Promise((resolve) => {
      const controller = new AbortController();
      this.currentPlaybackController = controller;
      
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (this.currentPlaybackController === controller) {
          this.currentPlaybackController = null;
        }
      };

      // Listen for abort signal
      controller.signal.addEventListener('abort', () => {
        cleanup();
        resolve();
      });

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = () => {
        cleanup();
        console.warn('Audio playback error - continuing anyway');
        resolve();
      };

      audio.play().catch((error: Error) => {
        console.warn('Audio play error:', error.message);
        cleanup();
        resolve();
      });
    });
  }
}

// Export singleton instance getter
export const getTTSManager = () => TTSManager.getInstance();
